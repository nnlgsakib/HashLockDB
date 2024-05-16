import express, { Request, Response } from 'express';
import multer from 'multer';
import { Level } from 'level';
import crypto from 'crypto';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import { imageUploadHandler } from './api/uploadImage';
import { videoUploadHandler } from './api/uploadVideo';
import { contentGatewayHandler } from './api/gateway';

const app = express();
app.use(cors());

const db: Level = new Level("./data");

const imagesDirectory = path.join(__dirname, 'images');
const videosDirectory = path.join(__dirname, 'videos');
if (!fs.existsSync(imagesDirectory)) {
    fs.mkdirSync(imagesDirectory);
}
if (!fs.existsSync(videosDirectory)) {
    fs.mkdirSync(videosDirectory);
}

const upload = multer({ dest: 'uploads/' });

function generateEthereumStyleHash(data: string): string {
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return 'nlg' + hash.slice(0, 40);
}

app.post('/upload/image', upload.single('image'), async (req: Request, res: Response) => {
    await imageUploadHandler(req, res, db, imagesDirectory);
});

app.post('/upload/video', upload.single('video'), async (req: Request, res: Response) => {
    await videoUploadHandler(req, res, db, videosDirectory);
});

app.get('/gateway/:hash', async (req: Request, res: Response) => {
    await contentGatewayHandler(req, res, db, imagesDirectory, videosDirectory);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
