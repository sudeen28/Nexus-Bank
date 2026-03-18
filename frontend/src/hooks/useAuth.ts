'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export function useAuth(requireAuth = true) {
  const { user, isLoading, isAuthenticated, loadUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) loadUser();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) router.replace('/login');
      if (!requireAuth && isAuthenticated) router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, requireAuth]);

  return { user, isLoading, isAuthenticated };
}

export function useRequireAdmin() {
  const { user, isLoading, isAuthenticated } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') router.replace('/dashboard');
    }
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isLoading, isAuthenticated, user]);
  return { user, isLoading };
}
