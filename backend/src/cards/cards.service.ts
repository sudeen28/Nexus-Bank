import { prisma } from '../prisma/client';
import { AppError, NotFoundError } from '../common/errors';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

function luhnGenerate(partial: string): string {
  const digits = partial.split('').map(Number);
  let sum = 0;
  let isEven = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (isEven) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    isEven = !isEven;
  }
  return String((10 - (sum % 10)) % 10);
}

function generateVisaNumber(): string {
  let num = '4' + Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join('');
  return num + luhnGenerate(num);
}

function generateCVV(): string {
  return String(Math.floor(100 + Math.random() * 900));
}

export async function createCard(userId: string, accountId?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const existingCards = await prisma.card.count({ where: { userId, status: { not: 'CANCELLED' } } });
  if (existingCards >= 5) throw new AppError('Maximum 5 active cards allowed', 400, 'MAX_CARDS');

  const cardNumber = generateVisaNumber();
  const cvv = generateCVV();
  const cvvHash = await bcrypt.hash(cvv, 10);
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 3);

  const card = await prisma.card.create({
    data: {
      id: uuid(),
      userId,
      accountId,
      cardNumber,
      maskedNumber: `****${cardNumber.slice(-4)}`,
      cardholderName: `${user.firstName} ${user.lastName}`.toUpperCase(),
      expiryMonth: expiry.getMonth() + 1,
      expiryYear: expiry.getFullYear(),
      cvvHash,
      status: 'ACTIVE',
      cardType: 'VIRTUAL',
      network: 'VISA',
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: 'SYSTEM',
      title: '💳 New Virtual Card Created',
      message: `Your virtual Visa card ending in ${cardNumber.slice(-4)} is ready to use.`,
    },
  });

  // Return full number only on creation
  return {
    ...card,
    cardNumber,
    cvv,
  };
}

export async function getCards(userId: string) {
  const cards = await prisma.card.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  // Never return full card numbers in list
  return cards.map(({ cardNumber, cvvHash, ...safe }) => safe);
}

export async function getCardDetails(cardId: string, userId: string) {
  const card = await prisma.card.findFirst({
    where: { id: cardId, userId },
  });
  if (!card) throw new NotFoundError('Card not found');
  // Return masked in normal view
  const { cardNumber, cvvHash, ...safe } = card;
  return safe;
}

export async function freezeCard(cardId: string, userId: string) {
  const card = await prisma.card.findFirst({ where: { id: cardId, userId } });
  if (!card) throw new NotFoundError('Card not found');
  if (card.status === 'CANCELLED') throw new AppError('Card is cancelled', 400);
  return prisma.card.update({ where: { id: cardId }, data: { status: 'FROZEN' } });
}

export async function unfreezeCard(cardId: string, userId: string) {
  const card = await prisma.card.findFirst({ where: { id: cardId, userId } });
  if (!card) throw new NotFoundError('Card not found');
  if (card.status === 'CANCELLED') throw new AppError('Card is cancelled', 400);
  return prisma.card.update({ where: { id: cardId }, data: { status: 'ACTIVE' } });
}

export async function cancelCard(cardId: string, userId: string) {
  const card = await prisma.card.findFirst({ where: { id: cardId, userId } });
  if (!card) throw new NotFoundError('Card not found');
  return prisma.card.update({ where: { id: cardId }, data: { status: 'CANCELLED' } });
}

export async function updateCardLimit(cardId: string, userId: string, dailyLimit: number) {
  const card = await prisma.card.findFirst({ where: { id: cardId, userId } });
  if (!card) throw new NotFoundError('Card not found');
  if (dailyLimit < 1 || dailyLimit > 10000) throw new AppError('Limit must be between $1 and $10,000', 400);
  return prisma.card.update({ where: { id: cardId }, data: { dailyLimit } });
}
