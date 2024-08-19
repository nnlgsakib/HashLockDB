import express, { Request, Response } from 'express';
import { keccak256 } from '../utils/encryption';
import { p2pNode } from '../p2p/p2p';

const gatewayRouter = express.Router();

// Route to get a single file
gatewayRouter.get('/:encryptedHash', async (req: Request, res: Response) => {
    try {
        const { encryptedHash } = req.params;
        const hash = keccak256(encryptedHash);

        const result = await p2pNode.getFile(hash);

        if (!result) {
            return res.status(404).send('Content not found');
        }

        const { metadata, data } = result;
        const fileBuffer = Buffer.from(data, 'base64'); // Decode base64 to binary data

        res.set('Content-Type', metadata.mimetype);
        res.send(fileBuffer);
    } catch (error) {
        console.error('Error retrieving content:', error);
        res.status(500).send('Internal server error');
    }
});

// Route to get directory contents
gatewayRouter.get('/directory/:mainHash', async (req: Request, res: Response) => {
    try {
        const { mainHash } = req.params;
        console.log('Requested main hash:', mainHash);

        const result = await p2pNode.getFile(mainHash);

        if (!result) {
            return res.status(404).send('Directory not found');
        }

        let fileHashes: { originalname: string, hash: string }[];
        try {
            fileHashes = JSON.parse(result.data); // Assuming the data is JSON encoded list of file hashes
        } catch (err) {
            console.error('Error parsing file hashes:', err);
            return res.status(500).send('Error parsing directory');
        }

        console.log('File hashes:', fileHashes);

        // Fetch metadata for each file in the directory
        const filesWithMetadata = await Promise.all(fileHashes.map(async (fileInfo) => {
            const fileResult = await p2pNode.getFile(fileInfo.hash);
            if (fileResult) {
                return {
                    originalname: fileInfo.originalname,
                    hash: fileInfo.hash,
                    mimetype: fileResult.metadata.mimetype,
                    size: Buffer.from(fileResult.data, 'base64').length // Get the size of the file data
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
});

export default gatewayRouter;



