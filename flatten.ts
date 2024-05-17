import express, { Request, Response } from 'express';
import multer from 'multer';
import { Level } from 'level';
import crypto from 'crypto';
import cors from 'cors';

const app = express();
app.use(cors());
const db: Level = new Level("./data");  // Change './data' to your desired LevelDB storage path

// Set up multer for handling file uploads
const upload = multer();

// Function to generate Ethereum-style hash
function generateEthereumStyleHash(data: string): string {
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return 'nlg' + hash.slice(0, 40);
}

// Endpoint to store images
app.post('/upload/image', upload.single('image'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { buffer: imageBuffer, mimetype, originalname } = req.file;

        // Generate SHA256 hash of the file data
        const hash = generateEthereumStyleHash(imageBuffer.toString('base64'));

        // Store the file data and metadata in LevelDB
        await db.put(hash, JSON.stringify({ mimetype, originalname, data: imageBuffer.toString('base64') }));

        return res.status(200).json({ hash });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Endpoint to store videos
app.post('/upload/video', upload.single('video'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { buffer: videoBuffer, mimetype, originalname } = req.file;

        // Generate SHA256 hash of the file data
        const hash = generateEthereumStyleHash(videoBuffer.toString('base64'));

        // Store the file data and metadata in LevelDB
        await db.put(hash, JSON.stringify({ mimetype, originalname, data: videoBuffer.toString('base64') }));

        return res.status(200).json({ hash });
    } catch (error) {
        console.error('Error uploading video:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Gateway endpoint to access images and videos
app.get('/gateway/:hash', async (req: Request, res: Response) => {
    try {
        const { hash } = req.params;

        // Check if the content exists in LevelDB
        const metadataStr = await db.get(hash);
        const metadata = JSON.parse(metadataStr);

        // Decode the file data from Base64
        const fileBuffer = Buffer.from(metadata.data, 'base64');

        // Set the appropriate content type and send the file content
        res.set('Content-Type', metadata.mimetype);
        res.send(fileBuffer);
    } catch (error) {
        console.error('Error retrieving content:', error);
        res.status(404).json({ message: 'Content not found' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
