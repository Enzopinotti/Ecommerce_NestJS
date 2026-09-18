import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailTransportFactory } from './mail.tokens';

function config(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => {
      if (values[key] === undefined) throw new Error(`Missing ${key}`);
      return values[key];
    }),
  } as unknown as ConfigService;
}

describe('MailService', () => {
  it('fails explicitly when transport is disabled', async () => {
    const service = new MailService(config({ MAIL_ENABLED: false }));

    await expect(
      service.sendMail('to@example.test', 'Subject', 'Body'),
    ).rejects.toThrow('Mail transport is disabled');
  });

  it('uses an explicitly injected test transport without exposing provider errors', async () => {
    const sendMail = jest
      .fn()
      .mockRejectedValue(
        new Error('smtp://user:secret-password@provider.example'),
      );
    const transportFactory: MailTransportFactory = jest
      .fn()
      .mockReturnValue({ sendMail });
    const service = new MailService(
      config({
        MAIL_ENABLED: true,
        EMAIL_USER: 'sender@example.test',
        EMAIL_PASSWORD: 'secret-password',
        SERVICE_MAIL: 'example-provider',
        SERVICE_MAIL_PORT: 587,
      }),
      transportFactory,
    );

    let failure: unknown;
    try {
      await service.sendMail('to@example.test', 'Subject', 'Body');
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect((failure as Error).message).toBe('Mail transport failed');
    expect((failure as Error).message).not.toContain('secret-password');
    expect(sendMail).toHaveBeenCalledWith({
      from: 'sender@example.test',
      to: 'to@example.test',
      subject: 'Subject',
      text: 'Body',
    });
  });
});
