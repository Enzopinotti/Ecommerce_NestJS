import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { MailService } from '../mail/mail.service';
import {
  comparePasswords,
  hashPassword,
  validatePassword,
} from '../utils/encryption.util';
import { UsersService } from './users.service';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async requestReset(email: string): Promise<void> {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenDigest = this.digestToken(rawToken);
    const user = await this.usersService.findByEmail(email.trim());

    if (!user) {
      return;
    }

    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.usersService.setPasswordResetDigest(
      user._id.toString(),
      tokenDigest,
      expiresAt,
    );

    const resetUrl = this.buildResetUrl(rawToken);

    try {
      await this.mailService.sendMail(
        String(user.email),
        'Recuperación de contraseña',
        `Estimado/a ${user.first_name},\n\nHas solicitado recuperar tu contraseña. Utiliza el siguiente enlace para restablecerla: ${resetUrl}`,
      );
    } catch {
      await this.usersService.clearPasswordResetDigest(
        user._id.toString(),
        tokenDigest,
      );
      this.logger.error('Password recovery delivery failed');
    }
  }

  async resetPassword(rawToken: string, password: string): Promise<void> {
    const tokenDigest = this.digestToken(rawToken);
    const user =
      await this.usersService.findPasswordResetCandidate(tokenDigest);

    if (!user || !user.resetPasswordExpires) {
      throw new BadRequestException('Invalid or expired recovery token');
    }

    if (user.resetPasswordExpires.getTime() <= Date.now()) {
      await this.usersService.clearPasswordResetDigest(
        user._id.toString(),
        tokenDigest,
      );
      throw new BadRequestException('Invalid or expired recovery token');
    }

    if (await comparePasswords(password, user.password)) {
      throw new BadRequestException(
        'La contraseña no puede ser igual a la anterior.',
      );
    }

    if (!validatePassword(password)) {
      throw new BadRequestException('Formato de contraseña invalido.');
    }

    const passwordHash = await hashPassword(password);
    const consumed = await this.usersService.consumePasswordReset(
      user._id.toString(),
      tokenDigest,
      passwordHash,
    );

    if (!consumed) {
      throw new BadRequestException('Invalid or expired recovery token');
    }
  }

  private digestToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private buildResetUrl(rawToken: string): string {
    const appBaseUrl = this.configService.getOrThrow<string>('APP_BASE_URL');
    const base = appBaseUrl.endsWith('/') ? appBaseUrl : `${appBaseUrl}/`;
    return new URL(
      `resetPassword/${encodeURIComponent(rawToken)}`,
      base,
    ).toString();
  }
}
