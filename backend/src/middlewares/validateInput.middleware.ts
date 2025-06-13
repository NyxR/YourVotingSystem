import { ZodSchema, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validateBodyInput =
  (schema: ZodSchema, errMsg?: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue) => ({
          name: issue.path[0],
          message: issue.message,
        }));
        res.status(400).send({
          error: 'Bad Request',
          message: errMsg ?? 'Please verify your input',
          data: errorMessages,
        });
      }
    }
  };
