import { Request, Response } from 'express';
import { Level } from 'level';
import { generateEthereumStyleHash } from './utils';
import fs from 'fs';
import path from 'path';

export const imageUploadHandler = async (req: Request, res: Response, db: Level, imagesDirectory: string) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { path: imagePath, mimetype, originalname } = req.file;

        const hash = generateEthereumStyleHash(imagePath);

        const destinationPath = path.join(imagesDirectory, hash);
        fs.renameSync(imagePath, destinationPath);

        await db.put(hash, JSON.stringify({ mimetype, originalname }));

        return res.status(200).json({ hash });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
