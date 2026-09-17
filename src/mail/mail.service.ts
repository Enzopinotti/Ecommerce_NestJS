import {
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  MAIL_TRANSPORT_FACTORY,
  MailTransport,
  MailTransportFactory,
} from './mail.tokens';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: MailTransport | null;
  private readonly sender: string | null;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(MAIL_TRANSPORT_FACTORY)
    transportFactory?: MailTransportFactory,
  ) {
    const mailEnabled = this.configService.get<boolean>('MAIL_ENABLED') ?? false;

    if (!mailEnabled) {
      this.transporter = null;
      this.sender = null;
      return;
    }

    const createTransport: MailTransportFactory =
      transportFactory ?? ((options) => nodemailer.createTransport(options));

    this.sender = this.configService.getOrThrow<string>('EMAIL_USER');
    this.transporter = createTransport({
      service: this.configService.getOrThrow<string>('SERVICE_MAIL'),
      auth: {
        user: this.sender,
        pass: this.configService.getOrThrow<string>('EMAIL_PASSWORD'),
      },
      port: this.configService.getOrThrow<number>('SERVICE_MAIL_PORT'),
    });
  }

  async sendMail(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter || !this.sender) {
      throw new ServiceUnavailableException('Mail transport is disabled');
    }

    try {
      await this.transporter.sendMail({
        from: this.sender,
        to,
        subject,
        text,
      });
      this.logger.log('Mail sent successfully');
    } catch {
      this.logger.error('Mail transport failed');
      throw new ServiceUnavailableException('Mail transport failed');
    }
  }
}
