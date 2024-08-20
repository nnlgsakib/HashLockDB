import { Router } from 'express';
import { handleGetFile } from './getFile';
import { handleGetDirectory } from './getDirectory';

const gatewayRouter = Router();

gatewayRouter.get('/:encryptedHash', handleGetFile);
gatewayRouter.get('/directory/:mainHash', handleGetDirectory);

export default gatewayRouter;