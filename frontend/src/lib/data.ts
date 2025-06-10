import { faker } from '@faker-js/faker';

export type Role = 'Admin' | 'Agent';

export type User = {
  id: string;
  username: string;
  email: string;
  role: Role;
};

export const createFakeUser = (role?: Role): User => {
  return {
    id: faker.string.uuid(),
    username: faker.person.fullName(),
    email: faker.internet.email(),
    role: faker.helpers.arrayElement(['Admin', 'Agent']),
  };
};

export const createFakeUsers = (numUser: number): User[] => {
  const users: User[] = [];
  for (let i = 0; i < numUser; i++) {
    users.push(createFakeUser());
  }
  return users;
};

export const data: User[] = [...createFakeUsers(100)];
