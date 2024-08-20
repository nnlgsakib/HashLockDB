import { Request, Response } from 'express';
import { keccak256 } from '../../utils/encryption';
import { p2pNode } from '../../p2p/p2p';

export const handleGetFile = async (req: Request, res: Response) => {
    try {
        const { encryptedHash } = req.params;
        const hash = keccak256(encryptedHash);

        const result = await p2pNode.getFile(hash);

        if (!result) {
            return res.status(404).send('Content not found');
        }

        const { metadata, data } = result;
        const fileBuffer = Buffer.from(data, 'base64');

        res.set('Content-Type', metadata.mimetype);
        res.send(fileBuffer);
    } catch (error) {
        console.error('Error retrieving content:', error);
        res.status(500).send('Internal server error');
    }
};
