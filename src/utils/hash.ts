import crypto from 'crypto';

export function generateEthereumStyleHash(data: string): string {
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return 'nlg' + hash.slice(0, 40);
}
