import * as nodemailer from 'nodemailer';

export const MAIL_TRANSPORT_FACTORY = Symbol('MAIL_TRANSPORT_FACTORY');

export type MailTransport = ReturnType<typeof nodemailer.createTransport>;
export type MailTransportFactory = (
  options: Parameters<typeof nodemailer.createTransport>[0],
) => MailTransport;
