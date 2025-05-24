import User from '@models/user.model';

export const findUsers = async () => {
  return User.findMany();
};
