'use client';

import { ApiUser, LoginResponse } from './types';

const STORAGE_KEY = 'nawettane_admin_session';

export interface AdminSession {
  token: string;
  user: ApiUser;
}

export function saveSession(payload: LoginResponse): void {
  if (typeof window === 'undefined') {
    return;
  }

  const session: AdminSession = {
    token: payload.accessToken,
    user: payload.user,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): AdminSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
