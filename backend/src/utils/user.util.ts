import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { randomBytes } from 'crypto';

export const SERVER_MSG_USER = {
  SUCCESS: {
    FIND: 'Fetched user successfully',
    INSERT: 'Created user successfully',
    UPDATE: '',
    DELETE: '',
  },
  FAILED: {
    FIND: 'Error occured when fetching users, Please try again',
    INSERT: 'Error occured when adding user, Please try again',
    DUPLICATE: 'Email Address already used',
    UPDATE: '',
    DELETE: '',
  },
};

export const generatePassword = (length: number = 12) => {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const bytes = randomBytes(length);
  const pwd = Array.from(bytes)
    .map((byte) => charset[byte % charset.length])
    .join('');
  return pwd;
};

export const duplicateUserHandler = (
  err: any,
  error_message: string
) => {
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const errMsg = [
        {
          name: 'email',
          message: SERVER_MSG_USER.FAILED.DUPLICATE,
        },
      ];
      return { error: 'Bad Request', code: 400, message: errMsg };
    } else {
      return {
        error: 'Internal Server Error',
        code: 500,
        message: error_message,
      };
    }
  } else {
    return {
      error: 'Internal Server Error',
      code: 500,
      message: error_message,
    };
  }
};
