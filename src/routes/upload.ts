import express, { Request, Response } from 'express';
import multer from 'multer';
import { generateEthereumStyleHash } from '../utils/hash';
import { db } from '../utils/db';

const uploadRouter = express.Router();
const upload = multer();

uploadRouter.post('/image', upload.single('image'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { buffer: imageBuffer, mimetype, originalname } = req.file;
        const hash = generateEthereumStyleHash(imageBuffer.toString('base64'));

        await db.put(hash, JSON.stringify({ mimetype, originalname, data: imageBuffer.toString('base64') }));
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

        await db.put(hash, JSON.stringify({ mimetype, originalname, data: videoBuffer.toString('base64') }));
        return res.status(200).json({ hash });
    } catch (error) {
        console.error('Error uploading video:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default uploadRouter;
