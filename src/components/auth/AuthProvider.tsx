'use client';

// =============================================================================
// Auth Provider — powered by @auth0/nextjs-auth0 v4
// Wraps useUser() and exposes the same AuthState shape so all existing
// components (TopNavigation, Dashboard, etc.) continue working unchanged.
// =============================================================================

import React, { createContext, useContext } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import type { AuthContext } from '../../types';

const NS = 'https://ebrr.app';

interface AuthState {
  user: AuthContext | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  switchTenant: (tenantId: string) => void;
}

const AuthReactContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: auth0User, isLoading } = useUser();

  const user: AuthContext | null = auth0User
    ? {
        userId: auth0User.sub ?? 'unknown',
        email: auth0User.email ?? undefined,
        name: auth0User.name ?? auth0User.nickname ?? auth0User.email ?? 'User',
        tenantId:
          (auth0User[`${NS}/tenantId`] as string) ||
          (auth0User.org_id as string) ||
          `tenant-${(auth0User.sub ?? '').split('|')[1]?.slice(0, 8) ?? 'default'}`,
        tenantName:
          (auth0User[`${NS}/tenantName`] as string) ||
          auth0User.email?.split('@')[1]?.split('.')[0] ||
          'My Organization',
        roles: (auth0User[`${NS}/roles`] as string[]) || ['investigator'],
        permissions: ['read:investigations', 'write:investigations'],
      }
    : null;

  const login = () => {
    window.location.href = '/auth/login';
  };

  const logout = () => {
    window.location.href = '/auth/logout';
  };

  const switchTenant = (_tenantId: string) => {
    // Real tenant switching requires Auth0 Management API changes to app_metadata.
    // For now, log a warning — implement later with the Management API.
    console.warn('Tenant switching requires Auth0 app_metadata update via Management API.');
  };

  return (
    <AuthReactContext.Provider value={{ user, isLoading, login, logout, switchTenant }}>
      {children}
    </AuthReactContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthReactContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
