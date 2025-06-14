import { Router } from 'express';
import { SERVER_MSG_USER } from '@utils/user.util';
import {
  getUsers,
  addUser,
  deleteUser,
} from '@controllers/user.controller';
import { validateBodyInput } from '@middlewares/validateInput.middleware';
import {
  insertUserSchema,
  deleteUserSchema,
} from '@validations/user.validation';

const userRouter = Router();

userRouter.get('/list', getUsers);
userRouter.post(
  '/add',
  validateBodyInput(insertUserSchema, SERVER_MSG_USER.FAILED.INSERT),
  addUser
);
userRouter.post(
  '/delete',
  validateBodyInput(deleteUserSchema, SERVER_MSG_USER.FAILED.DELETE),
  deleteUser
);

export default userRouter;
