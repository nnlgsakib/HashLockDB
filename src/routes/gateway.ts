import express, { Request, Response } from 'express';
import { db } from '../utils/db';
import { decryptData } from '../utils/encryption';

const gatewayRouter = express.Router();

gatewayRouter.get('/:hash', async (req: Request, res: Response) => {
    try {
        const { hash } = req.params;
        const encryptedMetadata = await db.get(hash);

        if (!encryptedMetadata) {
            return res.status(404).json({ message: 'Content not found' });
        }

        // Decrypt the metadata
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

export default gatewayRouter;
