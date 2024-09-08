import crypto from 'crypto';
import { hashToNlgmal } from './nmal';

export function generateEthereumStyleHash(data: string): string {
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return 'nlg' + hashToNlgmal(hash.slice(0, 40));
}
