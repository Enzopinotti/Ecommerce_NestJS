import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { MailService } from '../mail/mail.service';
import { hashPassword } from '../utils/encryption.util';
import { PasswordRecoveryService } from './password-recovery.service';
import { UsersService } from './users.service';

describe('PasswordRecoveryService', () => {
  let service: PasswordRecoveryService;
  let usersService: {
    findByEmail: jest.Mock;
    setPasswordResetDigest: jest.Mock;
    clearPasswordResetDigest: jest.Mock;
    findPasswordResetCandidate: jest.Mock;
    consumePasswordReset: jest.Mock;
  };
  let mailService: { sendMail: jest.Mock };

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      setPasswordResetDigest: jest.fn(),
      clearPasswordResetDigest: jest.fn(),
      findPasswordResetCandidate: jest.fn(),
      consumePasswordReset: jest.fn(),
    };
    mailService = { sendMail: jest.fn() };

    service = new PasswordRecoveryService(
      usersService as unknown as UsersService,
      mailService as unknown as MailService,
      {
        getOrThrow: jest.fn().mockReturnValue('https://example.test/app'),
      } as unknown as ConfigService,
    );
  });

  it('stores only a digest and sends the raw opaque token inside the configured reset URL', async () => {
    usersService.findByEmail.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      email: 'known@example.test',
      first_name: 'Known',
    });
    mailService.sendMail.mockResolvedValue(undefined);

    await service.requestReset('known@example.test');

    const [, digest, expiresAt] = usersService.setPasswordResetDigest.mock.calls[0];
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(expiresAt).toBeInstanceOf(Date);

    const mailText = mailService.sendMail.mock.calls[0][2] as string;
    const match = mailText.match(
      /https:\/\/example\.test\/app\/resetPassword\/([A-Za-z0-9_-]+)/,
    );
    expect(match).not.toBeNull();

    const rawToken = match![1];
    expect(rawToken).not.toBe(digest);
    expect(createHash('sha256').update(rawToken).digest('hex')).toBe(digest);
  });

  it('does not reveal a missing account through mail or persistence side effects', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(service.requestReset('missing@example.test')).resolves.toBeUndefined();
    expect(usersService.setPasswordResetDigest).not.toHaveBeenCalled();
    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it('clears the digest and keeps delivery failure internal', async () => {
    usersService.findByEmail.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      email: 'known@example.test',
      first_name: 'Known',
    });
    mailService.sendMail.mockRejectedValue(
      new ServiceUnavailableException('provider secret leaked here'),
    );

    await expect(service.requestReset('known@example.test')).resolves.toBeUndefined();
    expect(usersService.clearPasswordResetDigest).toHaveBeenCalledTimes(1);
  });

  it('hashes a valid new password and consumes the reset token once', async () => {
    const oldHash = await hashPassword('OldPassword1');
    usersService.findPasswordResetCandidate.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      password: oldHash,
      resetPasswordExpires: new Date(Date.now() + 60_000),
    });
    usersService.consumePasswordReset.mockResolvedValue(true);

    await service.resetPassword('x'.repeat(43), 'NewPassword2');

    expect(usersService.consumePasswordReset).toHaveBeenCalledTimes(1);
    const passwordHash = usersService.consumePasswordReset.mock.calls[0][2];
    expect(passwordHash).not.toBe('NewPassword2');
  });

  it('rejects missing, expired, reused and same-password recovery attempts', async () => {
    usersService.findPasswordResetCandidate.mockResolvedValueOnce(null);
    await expect(
      service.resetPassword('x'.repeat(43), 'NewPassword2'),
    ).rejects.toBeInstanceOf(BadRequestException);

    usersService.findPasswordResetCandidate.mockResolvedValueOnce({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      password: await hashPassword('OldPassword1'),
      resetPasswordExpires: new Date(Date.now() - 1_000),
    });
    await expect(
      service.resetPassword('y'.repeat(43), 'NewPassword2'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(usersService.clearPasswordResetDigest).toHaveBeenCalled();

    usersService.findPasswordResetCandidate.mockResolvedValueOnce({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      password: await hashPassword('OldPassword1'),
      resetPasswordExpires: new Date(Date.now() + 60_000),
    });
    usersService.consumePasswordReset.mockResolvedValueOnce(false);
    await expect(
      service.resetPassword('z'.repeat(43), 'NewPassword2'),
    ).rejects.toBeInstanceOf(BadRequestException);

    usersService.findPasswordResetCandidate.mockResolvedValueOnce({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      password: await hashPassword('SamePassword1'),
      resetPasswordExpires: new Date(Date.now() + 60_000),
    });
    await expect(
      service.resetPassword('q'.repeat(43), 'SamePassword1'),
    ).rejects.toThrow('La contraseña no puede ser igual a la anterior.');
  });
});
