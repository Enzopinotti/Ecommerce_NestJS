import bcrypt from 'bcrypt';

export async function hashPassword(password: String): Promise<string> {
    const saltRounds = 10; // Número de rondas de hashing
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

export async function comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
}

export async function validatePassword(password) {
    // Verifica si la contraseña tiene al menos una mayúscula, una minúscula, un número y longitud mayor a 6 caracteres
    const lowercaseRegex = /[a-z]/;
    const uppercaseRegex = /[A-Z]/;
    const numberRegex = /[0-9]/;
    const lengthCheck = password.length > 6;
    const hasLowercase = lowercaseRegex.test(password);
    const hasUppercase = uppercaseRegex.test(password);
    const hasNumber = numberRegex.test(password);
    console.log(lengthCheck, hasLowercase, hasUppercase, hasNumber);
    const bool = lengthCheck && hasLowercase && hasUppercase && hasNumber;
    console.log(bool);
    return lengthCheck && hasLowercase && hasUppercase && hasNumber;
}