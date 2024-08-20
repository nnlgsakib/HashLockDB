import { Router } from 'express';
import { uploadFileHandler, handleFileUpload } from './uploadFile.ts';
import { uploadDirectoryHandler, handleDirectoryUpload } from './uploadDirectory';

const uploadRouter = Router();

uploadRouter.post('/', uploadFileHandler, handleFileUpload);
uploadRouter.post('/directory', uploadDirectoryHandler, handleDirectoryUpload);

export default uploadRouter;
