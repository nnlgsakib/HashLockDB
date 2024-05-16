import express, { Request, Response } from 'express';
import multer from 'multer';
import  { Level } from 'level';
import crypto from 'crypto';
import fs from 'fs';
import cors from 'cors';
import path from 'path';

const app = express();
app.use(cors());
const db: Level = new Level("./data")  // Change './data' to your desired LevelDB storage path

// Create the 'images' and 'videos' directories if they don't exist
const imagesDirectory = path.join(__dirname, 'images');
const videosDirectory = path.join(__dirname, 'videos');
if (!fs.existsSync(imagesDirectory)) {
    fs.mkdirSync(imagesDirectory);
}
if (!fs.existsSync(videosDirectory)) {
    fs.mkdirSync(videosDirectory);
}

// Set up multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

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

        const { path: imagePath, mimetype, originalname } = req.file;

        // Generate SHA256 hash of the image data
        const hash = generateEthereumStyleHash(imagePath);

        // Move the uploaded file to permanent storage
        const destinationPath = path.join(imagesDirectory, hash);
        fs.renameSync(imagePath, destinationPath);

        // Store the image metadata (mimetype, original filename, etc.) in LevelDB
        await db.put(hash, JSON.stringify({ mimetype, originalname }));

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

        const { path: videoPath, mimetype, originalname } = req.file;

        // Generate SHA256 hash of the video data
        const hash = generateEthereumStyleHash(videoPath);

        // Move the uploaded file to permanent storage
        const destinationPath = path.join(videosDirectory, hash);
        fs.renameSync(videoPath, destinationPath);

        // Store the video metadata (mimetype, original filename, etc.) in LevelDB
        await db.put(hash, JSON.stringify({ mimetype, originalname }));

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

        let contentPath;
        if (fs.existsSync(path.join(imagesDirectory, hash))) {
            // Image exists
            contentPath = path.join(imagesDirectory, hash);
        } else if (fs.existsSync(path.join(videosDirectory, hash))) {
            // Video exists
            contentPath = path.join(videosDirectory, hash);
        } else {
            // Content not found
            throw new Error('Content not found');
        }

        // Read the content file from disk
        const contentBuffer = fs.readFileSync(contentPath);

        // Send the content data in the response with appropriate content type
        res.set('Content-Type', metadata.mimetype);
        res.send(contentBuffer);
    } catch (error) {
        console.error('Error retrieving content:', error);
        res.status(404).json({ message: 'Content not found' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});