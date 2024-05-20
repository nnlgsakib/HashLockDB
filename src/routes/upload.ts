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
        res.status(500).json({ message: "Unable to locate content"}); 
    }
});

uploadRouter.post('/directory', upload.array('files'), async (req: Request, res: Response) => {
    try {
        if (!req.files || !Array.isArray(req.files)) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        // Generate main hash for the directory
        const mainHash = generateEthereumStyleHash(Math.floor(new Date().getTime() / 1000).toString());

        const fileHashes = await Promise.all(req.files.map(async (file: Express.Multer.File) => {
            const { buffer, mimetype, originalname } = file;
            const randomOffset = Math.floor(Math.random() * 1000);
            const subHash = generateEthereumStyleHash(Math.floor(new Date().getTime() / 1000 + randomOffset).toString());
            const encryptedSubHash = keccak256(subHash);

            // Encrypt the data and metadata
            const encryptedData = encryptData(buffer.toString('base64'), encryptedSubHash);
            const metadata = JSON.stringify({ mimetype, originalname, data: encryptedData });
            const encryptedMetadata = encryptData(metadata, encryptedSubHash);

            await db.put(encryptedSubHash, encryptedMetadata);
            return { originalname, hash: subHash };
        }));

        // Store main hash and sub-hash relationships
        await db.put(mainHash, JSON.stringify(fileHashes));

        return res.status(200).json({ directoryHash: mainHash, files: fileHashes });
    } catch (error) {
        console.error('Error uploading directory:', error);
        res.status(500).json({ message: "Unable to upload directory" });
    }
});


export default uploadRouter;
