import User from '@models/user.model';
import { generatePassword } from '@utils/user.util';
import { TUpdateUserData, TUser } from '@validations/user.validation';

export const findUsers = async () => {
  return User.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });
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

export const updateUser = async (user_data: TUpdateUserData) => {
  const user = await User.update({
    where: { id: user_data.id },
    data: {
      username: user_data.name,
      role: user_data.role,
    },
  });
  return user;
};

export const removeUser = async (user_id: string) => {
  return await User.delete({
    where: { id: user_id },
  });
};

// import needed librairies
import axios from 'axios'; // for fetching data
import * as cheerio from 'cheerio'; // for parsing HTML data

// Define the point type
type Point = {
  x: number;
  y: number;
  char: string;
};

export const getPoints = async (doc_url: string) => {
  const { data } = await axios.get(doc_url);
  const $ = cheerio.load(data);

  const points: Point[] = [];

  // parsing each row of the table
  $('table tr').each((_, row) => {
    // getting cells for each row
    const cells = $(row).find('td');

    // save coordinates with the corresponding character
    if (cells.length === 3) {
      const x = parseInt($(cells[0]).text().trim());
      const char = $(cells[1]).text().trim();
      const y = parseInt($(cells[2]).text().trim());

      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y, char });
      }
    }
  });
  return points;
};

export const parseGoogleDoc = async (doc_url: string) => {
  const points: Point[] = await getPoints(doc_url);

  // getting max value of each axis X and Y
  const maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(...points.map((p) => p.y));

  // initialize the grid layout for diplaying
  const grid = Array.from({ length: maxY + 1 }, () =>
    Array(maxX + 1).fill(' '),
  );

  // assign character value for each coordinates on the grid layout
  points.forEach((p) => (grid[p.y][p.x] = p.char));

  // display the encoded word
  grid.forEach((row) => console.log(row.join('')));
};
