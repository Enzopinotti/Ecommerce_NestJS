export const MAIL_TRANSPORT_FACTORY = Symbol('MAIL_TRANSPORT_FACTORY');

export interface MailTransportOptions {
  service: string;
  auth: {
    user: string;
    pass: string;
  };
  port: number;
}

export interface MailTransport {
  sendMail(options: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
}

export type MailTransportFactory = (
  options: MailTransportOptions,
) => MailTransport;
