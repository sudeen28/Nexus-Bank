export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'FROZEN' | 'PENDING_VERIFICATION';
  avatar?: string;
  address?: string;
  city?: string;
  country?: string;
  dateOfBirth?: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  accounts?: Account[];
  kyc?: KycDocument;
  _count?: { notifications: number };
}

export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  routingNumber: string;
  accountType: string;
  balance: string | number;
  availableBalance: string | number;
  currency: string;
  isDefault: boolean;
  isFrozen: boolean;
  dailyLimit: string | number;
  monthlyLimit: string | number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  referenceId: string;
  senderAccountId?: string;
  receiverAccountId?: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string | number;
  fee: string | number;
  currency: string;
  description?: string;
  isFlagged: boolean;
  flagReason?: string;
  processedAt?: string;
  createdAt: string;
  senderAccount?: { user: { firstName: string; lastName: string } } & Partial<Account>;
  receiverAccount?: { user: { firstName: string; lastName: string } } & Partial<Account>;
}

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'CARD_PAYMENT' | 'REFUND' | 'FEE';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED' | 'FLAGGED';

export interface Card {
  id: string;
  userId: string;
  accountId?: string;
  maskedNumber: string;
  cardholderName: string;
  expiryMonth: number;
  expiryYear: number;
  cardType: string;
  network: string;
  status: 'ACTIVE' | 'FROZEN' | 'EXPIRED' | 'CANCELLED';
  dailyLimit: string | number;
  createdAt: string;
  cardNumber?: string;
  cvv?: string;
}

export interface KycDocument {
  id: string;
  userId: string;
  status: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  documentType?: string;
  documentNumber?: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'TRANSACTION' | 'SECURITY' | 'SYSTEM' | 'PROMOTION' | 'KYC';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
  unreadCount?: number;
}

export interface AccountStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  transactionCount: number;
  monthly: { month: string; income: number; expenses: number }[];
  accounts: Account[];
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  flaggedTransactions: number;
  pendingKyc: number;
  totalVolume: number;
  totalRevenue: number;
  signupTrend: { date: string; count: number }[];
}
