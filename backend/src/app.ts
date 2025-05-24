import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import router from '@routes/index';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: '*', credentials: true }));

app.use('/api', router);

export default app;
