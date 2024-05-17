import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload';
import gatewayRouter from './routes/gateway';

const app = express();
app.use(cors());
app.use('/upload', uploadRouter);
app.use('/gateway', gatewayRouter);

export default app;
