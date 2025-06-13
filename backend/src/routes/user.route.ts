import { Router } from 'express';
import { SERVER_MSG_USER } from '@utils/user.util';
import { getUsers, addUser } from '@controllers/user.controller';
import { validateBodyInput } from '@middlewares/validateInput.middleware';
import { insertUserSchema } from '@validations/user.validation';

const userRouter = Router();

userRouter.get('/', getUsers);
userRouter.post(
  '/add',
  validateBodyInput(insertUserSchema, SERVER_MSG_USER.FAILED.INSERT),
  addUser
);

export default userRouter;
