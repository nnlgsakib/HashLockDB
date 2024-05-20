import express, { Request, Response } from 'express';
import multer from 'multer';
import { generateEthereumStyleHash } from '../utils/hash';
import { db } from '../utils/db';

// Import encryption functions
import { encryptData, keccak256 } from '../utils/encryption';

const uploadRouter = express.Router();
const upload = multer();

uploadRouter.post('/image', upload.single('image'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { buffer: imageBuffer, mimetype, originalname } = req.file;
        const hash = generateEthereumStyleHash(imageBuffer.toString('base64'));
        const encryptedHash = keccak256(hash);

        // Encrypt the data and metadata
        const encryptedData = encryptData(imageBuffer.toString('base64'), encryptedHash);
        const metadata = JSON.stringify({ mimetype, originalname, data: encryptedData });
        const encryptedMetadata = encryptData(metadata, encryptedHash);

        await db.put(encryptedHash, encryptedMetadata);
        return res.status(200).json({ hash });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

uploadRouter.post('/video', upload.single('video'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { buffer: videoBuffer, mimetype, originalname } = req.file;
        const hash = generateEthereumStyleHash(videoBuffer.toString('base64'));
        const encryptedHash = keccak256(hash);

        // Encrypt the data and metadata
        const encryptedData = encryptData(videoBuffer.toString('base64'), encryptedHash);
        const metadata = JSON.stringify({ mimetype, originalname, data: encryptedData });
        const encryptedMetadata = encryptData(metadata, encryptedHash);

        await db.put(encryptedHash, encryptedMetadata);
        return res.status(200).json({ hash });
    } catch (error) {
        console.error('Error uploading video:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default uploadRouter;
