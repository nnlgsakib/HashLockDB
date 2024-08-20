import { Request, Response } from 'express';
import { p2pNode } from '../../p2p/p2p';

export const handleGetDirectory = async (req: Request, res: Response) => {
    try {
        const { mainHash } = req.params;

        const result = await p2pNode.getFile(mainHash);

        if (!result) {
            return res.status(404).send('Directory not found');
        }

        let fileHashes: { originalname: string, hash: string }[];
        try {
            fileHashes = JSON.parse(result.data);
        } catch (err) {
            console.error('Error parsing file hashes:', err);
            return res.status(500).send('Error parsing directory');
        }

        const filesWithMetadata = await Promise.all(fileHashes.map(async (fileInfo) => {
            const fileResult = await p2pNode.getFile(fileInfo.hash);
            if (fileResult) {
                return {
                    originalname: fileInfo.originalname,
                    hash: fileInfo.hash,
                    mimetype: fileResult.metadata.mimetype,
                    size: Buffer.from(fileResult.data, 'base64').length
                };
            }
            return null;
        }));

        const validFiles = filesWithMetadata.filter(file => file !== null);

        res.status(200).json({ files: validFiles });
    } catch (error) {
        console.error('Error retrieving directory contents:', error);
        res.status(500).send('Internal server error');
    }
};
