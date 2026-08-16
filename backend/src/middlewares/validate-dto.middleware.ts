import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { ValidationError } from '../utils/errors';

export function validateDto<T extends object>(DtoClass: new () => T) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const instance = Object.assign(new DtoClass(), req.body) as T;
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: false,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((e) =>
        Object.values(e.constraints ?? {})
      );
      return next(new ValidationError(messages.join('; ')));
    }

    req.body = instance;
    next();
  };
}
