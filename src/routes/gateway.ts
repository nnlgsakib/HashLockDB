import express, { Request, Response } from 'express';
import { db } from '../utils/db';
import { decryptData, keccak256 } from '../utils/encryption';

const gatewayRouter = express.Router();

gatewayRouter.get('/:encryptedHash', async (req: Request, res: Response) => {
    try {
        const { encryptedHash } = req.params;
        
        // Decrypt the hash using Keccak (SHA-3)
        const hash = keccak256(encryptedHash);
        
        const encryptedMetadata = await db.get(hash);

        if (!encryptedMetadata) {
            return res.status(404).json({ message: 'Content not found' });
        }

        // Decrypt the metadata using the decrypted hash
        const metadataStr = decryptData(encryptedMetadata, hash);
        const metadata = JSON.parse(metadataStr);

        // Decrypt the data using the hash as the key
        const decryptedData = decryptData(metadata.data, hash);
        const fileBuffer = Buffer.from(decryptedData, 'base64');

        res.set('Content-Type', metadata.mimetype);
        res.send(fileBuffer);
    } catch (error) {
        console.error('Error retrieving content:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// New endpoint for retrieving directory contents
gatewayRouter.get('/directory/:mainHash', async (req: Request, res: Response) => {
    try {
        const { mainHash } = req.params;
        
        console.log('Requested main hash:', mainHash);

        let encryptedFileHashes;
        try {
            encryptedFileHashes = await db.get(mainHash);
        } catch (err) {
            console.error('Error retrieving encrypted file hashes:', err);
            return res.status(500).json({ message: 'Error retrieving directory' });
        }

        console.log('Encrypted file hashes:', encryptedFileHashes);

        if (!encryptedFileHashes) {
            return res.status(404).json({ message: 'Directory not found' });
        }

        let fileHashes;
        try {
            fileHashes = JSON.parse(encryptedFileHashes);
        } catch (err) {
            console.error('Error parsing file hashes:', err);
            return res.status(500).json({ message: 'Error parsing directory' });
        }

        console.log('File hashes:', fileHashes);

        res.status(200).json({ files: fileHashes });
    } catch (error) {
        console.error('Error retrieving directory contents:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


export default gatewayRouter;
