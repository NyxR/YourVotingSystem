const BASE_API_URL = process.env.API_BASE_URL ?? '';
const USER_ROOT = `${BASE_API_URL}/user`;

export const USER_ENDPOINTS = {
  list: `${USER_ROOT}/list`,
  add: `${USER_ROOT}/add`,
};
