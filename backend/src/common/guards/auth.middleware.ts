import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from './errors';
import { prisma } from '../prisma/client';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError('No token provided');

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true, role: true },
    });

    if (!user) throw new UnauthorizedError('User not found');
    if (user.status === 'SUSPENDED') throw new UnauthorizedError('Account suspended');
    if (user.status === 'FROZEN') throw new UnauthorizedError('Account frozen');

    req.user = { ...payload, role: user.role };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return next(new UnauthorizedError('Token expired'));
    if (err instanceof jwt.JsonWebTokenError) return next(new UnauthorizedError('Invalid token'));
    next(err);
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) return next(new ForbiddenError('Insufficient permissions'));
    next();
  };
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
  } catch {}
  next();
};
