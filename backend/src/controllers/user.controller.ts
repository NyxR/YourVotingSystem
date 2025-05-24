import { Request, Response } from 'express';
import { findUsers } from '@services/user.service';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await findUsers();
    res
      .status(200)
      .send({ message: 'fetched user successfully', data: users });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: 'Internal Server Error',
      message: 'fetched user failed',
    });
  }
};
