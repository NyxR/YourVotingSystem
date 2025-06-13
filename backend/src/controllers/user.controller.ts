import { Request, Response } from 'express';
import {
  SERVER_MSG_USER,
  duplicateUserHandler,
} from '@utils/user.util';
import { findUsers, createUser } from '@services/user.service';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await findUsers();
    res
      .status(200)
      .send({ message: SERVER_MSG_USER.SUCCESS.FIND, data: users });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: 'Internal Server Error',
      message: SERVER_MSG_USER.FAILED.FIND,
    });
  }
};

export const addUser = async (req: Request, res: Response) => {
  const data = req.body;
  try {
    const user = await createUser(data);
    res
      .status(200)
      .send({ message: SERVER_MSG_USER.SUCCESS.INSERT, data: user });
  } catch (error) {
    console.log(error);
    const handled_error = duplicateUserHandler(
      error,
      SERVER_MSG_USER.FAILED.INSERT
    );
    res.status(handled_error.code).send({
      error: handled_error.error,
      message: SERVER_MSG_USER.FAILED.INSERT,
      data: handled_error.message,
    });
  }
};
