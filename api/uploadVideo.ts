import { Request, Response } from 'express';
import { Level } from 'level';
import { generateEthereumStyleHash } from './utils';
import fs from 'fs';
import path from 'path';

export const videoUploadHandler = async (req: Request, res: Response, db: Level, videosDirectory: string) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { path: videoPath, mimetype, originalname } = req.file;

        const hash = generateEthereumStyleHash(videoPath);

        const destinationPath = path.join(videosDirectory, hash);
        fs.renameSync(videoPath, destinationPath);

        await db.put(hash, JSON.stringify({ mimetype, originalname }));

        return res.status(200).json({ hash });
    } catch (error) {
        console.error('Error uploading video:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
