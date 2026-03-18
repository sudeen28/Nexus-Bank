import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { successResponse, asyncHandler } from '../common/response';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, 'Password must contain uppercase, number, and special character'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({ refreshToken: z.string() });

export const register = asyncHandler(async (req: Request, res: Response) => {
  const dto = registerSchema.parse(req.body);
  const result = await authService.register(dto);
  successResponse(res, result, 'Account created successfully', 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const dto = loginSchema.parse(req.body);
  const ipAddress = req.ip || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  const result = await authService.login({ ...dto, ipAddress, userAgent });
  successResponse(res, result, 'Login successful');
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.refreshAccessToken(refreshToken);
  successResponse(res, result, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken, req.user!.sub);
  successResponse(res, null, 'Logged out successfully');
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(req.user!.sub);
  successResponse(res, null, 'Logged out from all devices');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  successResponse(res, req.user, 'Current user');
});
