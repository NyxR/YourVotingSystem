import User from '@models/user.model';
import { generatePassword } from '@utils/user.util';
import { TUser } from '@validations/user.validation';

export const findUsers = async () => {
  return User.findMany();
};

export const createUser = async (user_data: TUser) => {
  const user = await User.create({
    data: {
      username: user_data.name,
      email: user_data.email,
      password: generatePassword(),
      role: user_data.role,
    },
  });
  return user;
};
