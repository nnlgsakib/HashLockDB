import { Request, Response } from 'express';
import { Level } from 'level';
import fs from 'fs';
import path from 'path';

export const contentGatewayHandler = async (req: Request, res: Response, db: Level, imagesDirectory: string, videosDirectory: string) => {
    try {
        const { hash } = req.params;

        const metadataStr = await db.get(hash);
        const metadata = JSON.parse(metadataStr);

        let contentPath;
        if (fs.existsSync(path.join(imagesDirectory, hash))) {
            contentPath = path.join(imagesDirectory, hash);
        } else if (fs.existsSync(path.join(videosDirectory, hash))) {
            contentPath = path.join(videosDirectory, hash);
        } else {
            throw new Error('Content not found');
        }

        const contentBuffer = fs.readFileSync(contentPath);

        res.set('Content-Type', metadata.mimetype);
        res.send(contentBuffer);
    } catch (error) {
        console.error('Error retrieving content:', error);
        res.status(404).json({ message: 'Content not found' });
    }
};
