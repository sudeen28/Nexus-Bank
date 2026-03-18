import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as usersService from './users.service';
import { authenticate } from '../common/guards/auth.middleware';
import { successResponse, asyncHandler } from '../common/response';
import multer from 'multer';
import path from 'path';
import { config } from '../config';
import { v4 as uuid } from 'uuid';
import fs from 'fs';

// ─── Multer setup ───
const uploadDir = config.upload.dir;
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    cb(null, ok);
  },
});

// ─── Schemas ───
const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/),
});

// ─── Handlers ───
const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await usersService.getProfile(req.user!.sub);
  successResponse(res, data);
});

const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateProfileSchema.parse(req.body);
  const data = await usersService.updateProfile(req.user!.sub, dto);
  successResponse(res, data, 'Profile updated');
});

const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await usersService.changePassword(req.user!.sub, currentPassword, newPassword);
  successResponse(res, null, 'Password changed successfully');
});

const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new Error('No file uploaded');
  const filePath = `/uploads/${req.file.filename}`;
  const data = await usersService.updateAvatar(req.user!.sub, filePath);
  successResponse(res, data, 'Avatar updated');
});

const getActivity = asyncHandler(async (req: Request, res: Response) => {
  const data = await usersService.getActivityLog(req.user!.sub);
  successResponse(res, data);
});

// ─── Router ───
const router = Router();
router.use(authenticate);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/change-password', changePassword);
router.post('/avatar', upload.single('avatar'), uploadAvatar);
router.get('/activity', getActivity);

export default router;
