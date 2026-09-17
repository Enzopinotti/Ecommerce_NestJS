import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function validatePassword(password: string): boolean {
  const lowercaseRegex = /[a-z]/;
  const uppercaseRegex = /[A-Z]/;
  const numberRegex = /[0-9]/;
  const lengthCheck = password.length > 6;

  return (
    lengthCheck &&
    lowercaseRegex.test(password) &&
    uppercaseRegex.test(password) &&
    numberRegex.test(password)
  );
}
