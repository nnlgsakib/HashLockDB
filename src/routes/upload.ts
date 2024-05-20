import express, { Request, Response } from 'express';
import multer from 'multer';
import { generateEthereumStyleHash } from '../utils/hash';
import { db } from '../utils/db';
import { encryptData, keccak256 } from '../utils/encryption';

const uploadRouter = express.Router();
const upload = multer();

// Single endpoint to handle all file uploads
uploadRouter.post('/', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { buffer, mimetype, originalname } = req.file;
        const hash = generateEthereumStyleHash(Math.floor(new Date().getTime() / 1000).toString());
        const encryptedHash = keccak256(hash);

        // Encrypt the data and metadata
        const encryptedData = encryptData(buffer.toString('base64'), encryptedHash);
        const metadata = JSON.stringify({ mimetype, originalname, data: encryptedData });
        const encryptedMetadata = encryptData(metadata, encryptedHash);

        await db.put(encryptedHash, encryptedMetadata);
        return res.status(200).json({ hash });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default uploadRouter;
