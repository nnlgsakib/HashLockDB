import crypto from 'crypto';

// AES encryption algorithm
const ALGORITHM = 'aes-256-cbc';

// Function to encrypt data using AES
export function encryptData(data: string, key: string): string {
    const iv = crypto.randomBytes(16); // Generate a random initialization vector
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Combine IV and encrypted data for decryption
    return iv.toString('hex') + ':' + encrypted;
}

// Function to decrypt data using AES
export function decryptData(encryptedData: string, key: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts.shift() as string, 'hex'); // Extract the IV
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Function to encrypt hash using Keccak (SHA-3)
export function keccak256(data: string): string {
    const hash = crypto.createHash('sha3-256');
    hash.update(data);
    return hash.digest('hex');
}
