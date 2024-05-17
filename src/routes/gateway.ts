import express, { Request, Response } from 'express';
import { db } from '../utils/db';

const gatewayRouter = express.Router();

gatewayRouter.get('/:hash', async (req: Request, res: Response) => {
    try {
        const { hash } = req.params;
        const metadataStr = await db.get(hash);
        const metadata = JSON.parse(metadataStr);
        const fileBuffer = Buffer.from(metadata.data, 'base64');

        res.set('Content-Type', metadata.mimetype);
        res.send(fileBuffer);
    } catch (error) {
        console.error('Error retrieving content:', error);
        res.status(404).json({ message: 'Content not found' });
    }
});

export default gatewayRouter;
