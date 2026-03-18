import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { NotFoundError, AppError } from '../common/errors';
import { authenticate } from '../common/guards/auth.middleware';
import { successResponse, asyncHandler } from '../common/response';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

// ─── Multer ───
const kycDir = path.join(config.upload.dir, 'kyc');
if (!fs.existsSync(kycDir)) fs.mkdirSync(kycDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, kycDir),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (_req, file, cb) => {
    const ok = /jpeg|jpg|png|pdf/i.test(path.extname(file.originalname));
    cb(null, ok);
  },
});

// ─── Service ───
async function getKycStatus(userId: string) {
  const kyc = await prisma.kycDocument.findUnique({ where: { userId } });
  if (!kyc) throw new NotFoundError('KYC record not found');
  return kyc;
}

async function submitKyc(userId: string, data: {
  documentType: string;
  documentNumber: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  selfieUrl?: string;
}) {
  const kyc = await prisma.kycDocument.findUnique({ where: { userId } });
  if (!kyc) throw new NotFoundError('KYC record not found');
  if (kyc.status === 'APPROVED') throw new AppError('KYC already approved', 400);

  const updated = await prisma.kycDocument.update({
    where: { userId },
    data: {
      status: 'PENDING',
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      frontImageUrl: data.frontImageUrl,
      backImageUrl: data.backImageUrl,
      selfieUrl: data.selfieUrl,
      submittedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: 'KYC',
      title: '📋 KYC Submitted',
      message: 'Your identity documents have been submitted for review. We\'ll notify you within 24-48 hours.',
    },
  });

  return updated;
}

// ─── Router ───
const router = Router();
router.use(authenticate);

router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const kyc = await getKycStatus(req.user!.sub);
  successResponse(res, kyc);
}));

router.post('/submit', upload.fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]), asyncHandler(async (req: Request, res: Response) => {
  const { documentType, documentNumber } = z.object({
    documentType: z.enum(['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID']),
    documentNumber: z.string().min(4),
  }).parse(req.body);

  const files = req.files as Record<string, Express.Multer.File[]>;
  const result = await submitKyc(req.user!.sub, {
    documentType,
    documentNumber,
    frontImageUrl: files?.frontImage?.[0] ? `/uploads/kyc/${files.frontImage[0].filename}` : undefined,
    backImageUrl: files?.backImage?.[0] ? `/uploads/kyc/${files.backImage[0].filename}` : undefined,
    selfieUrl: files?.selfie?.[0] ? `/uploads/kyc/${files.selfie[0].filename}` : undefined,
  });
  successResponse(res, result, 'KYC submitted for review');
}));

export default router;
