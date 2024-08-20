import { Request, Response } from 'express';
import multer from 'multer';
import { generateEthereumStyleHash } from '../../utils/hash';
import { db } from '../../utils/db';
import { encryptData, keccak256 } from '../../utils/encryption';

const upload = multer();

export const uploadDirectoryHandler = upload.array('files');

export const handleDirectoryUpload = async (req: Request, res: Response) => {
    try {
        if (!req.files || !Array.isArray(req.files)) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const mainHash = generateEthereumStyleHash(Math.floor(new Date().getTime() / 1000).toString());

        const fileHashes = await Promise.all(req.files.map(async (file: Express.Multer.File) => {
            const { buffer, mimetype, originalname } = file;
            const randomOffset = Math.floor(Math.random() * 1000);
            const subHash = generateEthereumStyleHash(Math.floor(new Date().getTime() / 1000 + randomOffset).toString());
            const encryptedSubHash = keccak256(subHash);

            const encryptedData = encryptData(buffer.toString('base64'), encryptedSubHash);
            const metadata = JSON.stringify({ mimetype, originalname, data: encryptedData });
            const encryptedMetadata = encryptData(metadata, encryptedSubHash);

            await db.put(encryptedSubHash, encryptedMetadata);
            return { originalname, hash: subHash };
        }));

        await db.put(mainHash, JSON.stringify(fileHashes));

        return res.status(200).json({ directoryHash: mainHash, files: fileHashes });
    } catch (error) {
        console.error('Error uploading directory:', error);
        res.status(500).json({ message: "Unable to upload directory" });
    }
};
