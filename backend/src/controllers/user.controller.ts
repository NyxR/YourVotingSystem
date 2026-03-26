import { Request, Response } from 'express';
import {
  SERVER_MSG_USER,
  duplicateUserHandler,
} from '@utils/user.util';
import {
  findUsers,
  createUser,
  removeUser,
  updateUser,
  parseGoogleDoc,
} from '@services/user.service';

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
      SERVER_MSG_USER.FAILED.INSERT,
    );
    res.status(handled_error.code).send({
      error: handled_error.error,
      message: SERVER_MSG_USER.FAILED.INSERT,
      data: handled_error.message,
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.body;
  try {
    const users = await removeUser(id);
    res
      .status(200)
      .send({ message: SERVER_MSG_USER.SUCCESS.DELETE, data: users });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: 'Internal Server Error',
      message: SERVER_MSG_USER.FAILED.DELETE,
    });
  }
};

export const editUser = async (req: Request, res: Response) => {
  const data = req.body;
  try {
    const user = await updateUser(data);
    res
      .status(200)
      .send({ message: SERVER_MSG_USER.SUCCESS.UPDATE, data: user });
  } catch (error) {
    console.log(error);
    const handled_error = duplicateUserHandler(
      error,
      SERVER_MSG_USER.FAILED.UPDATE,
    );
    res.status(handled_error.code).send({
      error: handled_error.error,
      message: SERVER_MSG_USER.FAILED.UPDATE,
      data: handled_error.message,
    });
  }
};

export const parseDoc = async (req: Request, res: Response) => {
  const { doc_url } = req.body;
  try {
    const user = await parseGoogleDoc(doc_url);
    res
      .status(200)
      .send({ message: SERVER_MSG_USER.SUCCESS.UPDATE, data: user });
  } catch (error) {
    console.log(error);
    const handled_error = duplicateUserHandler(
      error,
      SERVER_MSG_USER.FAILED.UPDATE,
    );
    res.status(handled_error.code).send({
      error: handled_error.error,
      message: SERVER_MSG_USER.FAILED.UPDATE,
      data: handled_error.message,
    });
  }
};
