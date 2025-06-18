import * as crypto from 'crypto';
import config from '../config.js';

const algorithm = 'aes-256-cbc';

// Generate a 32-byte key from your custom password

const key = crypto.createHash('sha256').update(config.customPassword).digest();

// 16-byte IV (must be exactly 16 bytes for AES-CBC)
const iv = Buffer.from('1234567810123456'); // example IV

export function encrypt(text: string): string {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

export function decrypt(encryptedText: string): string {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Example usage

