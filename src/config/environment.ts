export type NodeEnvironment = 'development' | 'test' | 'production';

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  MONGODB_URI: string;
  JWT_KEY: string;
  APP_BASE_URL: string;
  MAIL_ENABLED: boolean;
  SERVICE_MAIL?: string;
  SERVICE_MAIL_PORT?: number;
  EMAIL_USER?: string;
  EMAIL_PASSWORD?: string;
}

type ValidatedEnvironment = Record<string, unknown> & EnvironmentVariables;

const VALID_NODE_ENVIRONMENTS = new Set<NodeEnvironment>([
  'development',
  'test',
  'production',
]);

function readString(
  config: Record<string, unknown>,
  key: string,
  options: { required?: boolean; minLength?: number } = {},
): string | undefined {
  const rawValue = config[key];
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';

  if (!value) {
    if (options.required) {
      throw new Error(`${key} is required`);
    }
    return undefined;
  }

  if (options.minLength && value.length < options.minLength) {
    throw new Error(
      `${key} must be at least ${options.minLength} characters long`,
    );
  }

  return value;
}

function readPort(
  config: Record<string, unknown>,
  key: string,
  fallback?: number,
): number {
  const rawValue = config[key];
  const candidate =
    rawValue === undefined || rawValue === null || rawValue === ''
      ? fallback
      : Number(rawValue);

  if (
    candidate === undefined ||
    !Number.isInteger(candidate) ||
    candidate < 1 ||
    candidate > 65535
  ) {
    throw new Error(`${key} must be an integer between 1 and 65535`);
  }

  return candidate;
}

function readBoolean(
  config: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const rawValue = config[key];

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return fallback;
  }

  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  throw new Error(`${key} must be either true or false`);
}

function readNodeEnvironment(config: Record<string, unknown>): NodeEnvironment {
  const rawValue = readString(config, 'NODE_ENV') ?? 'development';

  if (!VALID_NODE_ENVIRONMENTS.has(rawValue as NodeEnvironment)) {
    throw new Error('NODE_ENV must be one of: development, test, production');
  }

  return rawValue as NodeEnvironment;
}

function readMongoUri(config: Record<string, unknown>): string {
  const uri = readString(config, 'MONGODB_URI', { required: true })!;

  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error('MONGODB_URI must use mongodb:// or mongodb+srv://');
  }

  return uri;
}

function readBaseUrl(config: Record<string, unknown>): string {
  const rawUrl = readString(config, 'APP_BASE_URL', { required: true })!;
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('APP_BASE_URL must be a valid absolute URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('APP_BASE_URL must use http:// or https://');
  }

  if (parsed.username || parsed.password) {
    throw new Error('APP_BASE_URL must not contain credentials');
  }

  return rawUrl.replace(/\/+$/, '');
}

export function validateEnvironment(
  config: Record<string, unknown>,
): ValidatedEnvironment {
  const NODE_ENV = readNodeEnvironment(config);
  const PORT = readPort(config, 'PORT', 3000);
  const MONGODB_URI = readMongoUri(config);
  const JWT_KEY = readString(config, 'JWT_KEY', {
    required: true,
    minLength: 32,
  })!;
  const APP_BASE_URL = readBaseUrl(config);
  const MAIL_ENABLED = readBoolean(config, 'MAIL_ENABLED', false);

  let SERVICE_MAIL: string | undefined;
  let SERVICE_MAIL_PORT: number | undefined;
  let EMAIL_USER: string | undefined;
  let EMAIL_PASSWORD: string | undefined;

  if (MAIL_ENABLED) {
    SERVICE_MAIL = readString(config, 'SERVICE_MAIL', { required: true })!;
    SERVICE_MAIL_PORT = readPort(config, 'SERVICE_MAIL_PORT');
    EMAIL_USER = readString(config, 'EMAIL_USER', { required: true })!;
    EMAIL_PASSWORD = readString(config, 'EMAIL_PASSWORD', { required: true })!;
  }

  return {
    ...config,
    NODE_ENV,
    PORT,
    MONGODB_URI,
    JWT_KEY,
    APP_BASE_URL,
    MAIL_ENABLED,
    SERVICE_MAIL,
    SERVICE_MAIL_PORT,
    EMAIL_USER,
    EMAIL_PASSWORD,
  };
}
