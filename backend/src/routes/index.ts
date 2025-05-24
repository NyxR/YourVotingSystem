import { Router } from 'express';
import userRouter from '@routes/user.route';

const router = Router();
router.use('/user', userRouter);

export default router;
