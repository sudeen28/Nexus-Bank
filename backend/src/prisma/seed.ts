import { PrismaClient, UserRole, UserStatus, TransactionType, TransactionStatus, CardStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function generateAccountNumber(): Promise<string> {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function generateCardNumber(): string {
  const prefix = '4532';
  let num = prefix;
  for (let i = 0; i < 12; i++) num += Math.floor(Math.random() * 10);
  return num;
}

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.kycDocument.deleteMany();
  await prisma.card.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcrypt.hash('Admin@123456', 12);
  const userHash = await bcrypt.hash('User@123456', 12);

  // Admin user
  const admin = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'admin@nexusbank.com',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: adminHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      country: 'US',
    },
  });

  // Demo users
  const usersData = [
    { firstName: 'Alex', lastName: 'Morgan', email: 'alex@demo.com', balance: '48520.00' },
    { firstName: 'Sarah', lastName: 'Chen', email: 'sarah@demo.com', balance: '125300.50' },
    { firstName: 'Marcus', lastName: 'Williams', email: 'marcus@demo.com', balance: '9870.25' },
    { firstName: 'Priya', lastName: 'Patel', email: 'priya@demo.com', balance: '234100.00' },
  ];

  for (const ud of usersData) {
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        email: ud.email,
        firstName: ud.firstName,
        lastName: ud.lastName,
        passwordHash: userHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        country: 'US',
        dateOfBirth: new Date('1990-06-15'),
        address: '123 Main St',
        city: 'New York',
      },
    });

    const acctNo = await generateAccountNumber();
    const account = await prisma.account.create({
      data: {
        id: uuid(),
        userId: user.id,
        accountNumber: acctNo,
        balance: ud.balance,
        availableBalance: ud.balance,
        isDefault: true,
        currency: 'USD',
      },
    });

    // Virtual card
    const cardNum = generateCardNumber();
    await prisma.card.create({
      data: {
        id: uuid(),
        userId: user.id,
        accountId: account.id,
        cardNumber: cardNum,
        maskedNumber: `****${cardNum.slice(-4)}`,
        cardholderName: `${ud.firstName} ${ud.lastName}`.toUpperCase(),
        expiryMonth: 12,
        expiryYear: 2027,
        cvvHash: await bcrypt.hash('123', 10),
        status: CardStatus.ACTIVE,
        cardType: 'VIRTUAL',
        network: 'VISA',
      },
    });

    // KYC
    await prisma.kycDocument.create({
      data: {
        id: uuid(),
        userId: user.id,
        status: 'APPROVED',
        documentType: 'PASSPORT',
        documentNumber: `P${Math.random().toString().slice(2, 10)}`,
        submittedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    // Transactions
    const txTypes = [
      { type: TransactionType.DEPOSIT, desc: 'ACH Direct Deposit', amount: '3500.00', status: TransactionStatus.COMPLETED },
      { type: TransactionType.WITHDRAWAL, desc: 'ATM Withdrawal - Chase', amount: '200.00', status: TransactionStatus.COMPLETED },
      { type: TransactionType.CARD_PAYMENT, desc: 'Amazon.com Purchase', amount: '89.99', status: TransactionStatus.COMPLETED },
      { type: TransactionType.CARD_PAYMENT, desc: 'Whole Foods Market', amount: '142.50', status: TransactionStatus.COMPLETED },
      { type: TransactionType.DEPOSIT, desc: 'Payroll - TechCorp Inc', amount: '5200.00', status: TransactionStatus.COMPLETED },
      { type: TransactionType.CARD_PAYMENT, desc: 'Netflix Subscription', amount: '15.99', status: TransactionStatus.COMPLETED },
      { type: TransactionType.WITHDRAWAL, desc: 'Rent Payment', amount: '1800.00', status: TransactionStatus.COMPLETED },
      { type: TransactionType.CARD_PAYMENT, desc: 'Shell Gas Station', amount: '67.20', status: TransactionStatus.COMPLETED },
      { type: TransactionType.DEPOSIT, desc: 'Venmo Transfer Received', amount: '250.00', status: TransactionStatus.COMPLETED },
      { type: TransactionType.CARD_PAYMENT, desc: 'Spotify Premium', amount: '9.99', status: TransactionStatus.COMPLETED },
    ];

    for (let i = 0; i < txTypes.length; i++) {
      const tx = txTypes[i];
      await prisma.transaction.create({
        data: {
          id: uuid(),
          referenceId: uuid(),
          senderAccountId: tx.type !== TransactionType.DEPOSIT ? account.id : null,
          receiverAccountId: tx.type === TransactionType.DEPOSIT ? account.id : null,
          type: tx.type,
          status: tx.status,
          amount: tx.amount,
          fee: tx.type === TransactionType.TRANSFER_OUT ? '0.50' : '0',
          currency: 'USD',
          description: tx.desc,
          processedAt: new Date(Date.now() - i * 86400000 * 2),
          createdAt: new Date(Date.now() - i * 86400000 * 2),
        },
      });
    }

    // Notifications
    await prisma.notification.createMany({
      data: [
        {
          id: uuid(),
          userId: user.id,
          type: 'TRANSACTION',
          title: 'Transaction Successful',
          message: `Your deposit of $3,500.00 has been processed.`,
          isRead: false,
        },
        {
          id: uuid(),
          userId: user.id,
          type: 'SECURITY',
          title: 'New Login Detected',
          message: 'A new login was detected from Chrome on Windows.',
          isRead: true,
        },
        {
          id: uuid(),
          userId: user.id,
          type: 'KYC',
          title: 'Identity Verified',
          message: 'Your identity verification has been approved.',
          isRead: false,
        },
      ],
    });
  }

  console.log('✅ Seed completed!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Admin:  admin@nexusbank.com / Admin@123456');
  console.log('  User 1: alex@demo.com / User@123456');
  console.log('  User 2: sarah@demo.com / User@123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
