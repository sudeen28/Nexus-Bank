import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../prisma/client';
import { config } from '../config';
import { AppError, UnauthorizedError, ConflictError } from '../common/errors';
import { sendEmail, emailTemplates } from '../common/email.service';
import { logger } from '../common/logger';

interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  country?: string;
}

interface LoginDto {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

function generateAccountNumber(): string {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function generateTokens(userId: string, email: string, role: string) {
  const accessToken = jwt.sign(
    { sub: userId, email, role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpires as any }
  );
  const refreshToken = jwt.sign(
    { sub: userId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpires as any }
  );
  return { accessToken, refreshToken };
}

export async function register(dto: RegisterDto) {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } });
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(dto.password, 12);
  const accountNumber = generateAccountNumber();

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passwordHash,
        status: 'ACTIVE',
        emailVerified: false,
        country: dto.country || 'US',
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });

    await tx.account.create({
      data: {
        userId: newUser.id,
        accountNumber,
        balance: '0',
        availableBalance: '0',
        isDefault: true,
        currency: 'USD',
      },
    });

    await tx.kycDocument.create({ data: { userId: newUser.id } });

    await tx.notification.create({
      data: {
        userId: newUser.id,
        type: 'SYSTEM',
        title: 'Welcome to NexusBank!',
        message: 'Your account has been created. Complete your KYC to unlock all features.',
      },
    });

    return newUser;
  });

  await sendEmail({
    to: user.email,
    ...emailTemplates.welcome(`${user.firstName} ${user.lastName}`),
  });

  logger.info(`New user registered: ${user.email}`);
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
}

export async function login(dto: LoginDto) {
  const user = await prisma.user.findUnique({
    where: { email: dto.email },
    include: { accounts: { where: { isDefault: true }, take: 1 } },
  });

  if (!user) throw new UnauthorizedError('Invalid credentials');

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new AppError(`Account locked. Try again in ${mins} minutes.`, 423, 'ACCOUNT_LOCKED');
  }

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) {
    const attempts = user.loginAttempts + 1;
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: attempts, lockedUntil },
    });
    throw new UnauthorizedError('Invalid credentials');
  }

  if (user.status === 'SUSPENDED') throw new AppError('Account suspended. Contact support.', 403, 'SUSPENDED');
  if (user.status === 'FROZEN') throw new AppError('Account frozen. Contact support.', 403, 'FROZEN');

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: dto.ipAddress,
      },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    }),
  ]);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
    },
  };
}

export async function refreshAccessToken(token: string) {
  let payload: any;
  try {
    payload = jwt.verify(token, config.jwt.refreshSecret);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired or revoked');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new UnauthorizedError('User not found');

  const { accessToken, refreshToken: newRefresh } = generateTokens(user.id, user.email, user.role);

  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefresh,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  return { accessToken, refreshToken: newRefresh };
}

export async function logout(refreshToken: string, userId: string) {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, userId },
    data: { isRevoked: true },
  });
}

export async function logoutAll(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });
}
