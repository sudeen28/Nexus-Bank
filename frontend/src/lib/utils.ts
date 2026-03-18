import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) { return clsx(inputs); }

export function formatCurrency(amount: string | number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount));
}
export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  return format(new Date(date), fmt);
}
export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
export function maskAccountNumber(num: string): string {
  if (!num) return '••••';
  return `••••${num.slice(-4)}`;
}
export function getTransactionColor(type: string): string {
  if (['DEPOSIT', 'TRANSFER_IN', 'REFUND'].includes(type)) return 'text-emerald-600';
  return 'text-red-500';
}
export function getTransactionSign(type: string): '+' | '-' {
  if (['DEPOSIT', 'TRANSFER_IN', 'REFUND'].includes(type)) return '+';
  return '-';
}
export function getStatusBadge(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: 'badge-green', PENDING: 'badge-yellow', FAILED: 'badge-red',
    REVERSED: 'badge-gray', FLAGGED: 'badge-red', ACTIVE: 'badge-green',
    FROZEN: 'badge-blue', SUSPENDED: 'badge-red', APPROVED: 'badge-green',
    REJECTED: 'badge-red', NOT_SUBMITTED: 'badge-gray', CANCELLED: 'badge-gray',
    PENDING_VERIFICATION: 'badge-yellow',
  };
  return map[status] || 'badge-gray';
}
export function getTransactionIcon(type: string): string {
  const map: Record<string, string> = {
    DEPOSIT: '↓', WITHDRAWAL: '↑', TRANSFER_IN: '←',
    TRANSFER_OUT: '→', CARD_PAYMENT: '💳', REFUND: '↩', FEE: '⚡',
  };
  return map[type] || '•';
}
export function truncate(str: string, len = 32): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}
export function getErrorMessage(err: any): string {
  return err?.response?.data?.error?.message || err?.message || 'Something went wrong';
}
export function getInitials(first: string, last: string): string {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
}
