'use client';

// =============================================================================
// Auth Provider — powered by @auth0/nextjs-auth0 v4 with Demo Mode Fallback
// Wraps useUser() and exposes AuthContext with isGuest and role metadata.
// =============================================================================

import React, { createContext, useContext } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import type { AuthContext, WorkspaceRole } from '../../types/domain';

const NS = 'https://ebrr.app';

interface AuthState {
  user: AuthContext | null;
  isLoading: boolean;
  isGuest: boolean;
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
        picture: auth0User.picture,
        tenantId:
          (auth0User[`${NS}/tenantId`] as string) ||
          (auth0User.org_id as string) ||
          `tenant-${(auth0User.sub ?? '').split('|')[1]?.slice(0, 8) ?? 'default'}`,
        tenantName:
          (auth0User[`${NS}/tenantName`] as string) ||
          auth0User.email?.split('@')[1]?.split('.')[0] ||
          'My Organization',
        roles: (auth0User[`${NS}/roles`] as string[]) || ['investigator'],
        role: (auth0User[`${NS}/roles`]?.includes('admin') ? 'OWNER' : 'EDITOR') as WorkspaceRole,
        isGuest: false,
        permissions: ['read:investigations', 'write:investigations', 'read:graph', 'write:graph'],
      }
    : {
        userId: 'guest_user',
        name: 'Guest Investigator',
        email: undefined,
        tenantId: 'tenant-alpha-compliance',
        tenantName: 'EBRR Public Demo Workspace',
        roles: ['GUEST_VIEWER'],
        role: 'GUEST_VIEWER',
        isGuest: true,
        permissions: ['read:investigations', 'read:graph'],
      };

  const login = () => {
    window.location.href = '/auth/login';
  };

  const logout = () => {
    window.location.href = '/auth/logout';
  };

  const switchTenant = (_tenantId: string) => {
    console.warn('Tenant switching requires Auth0 app_metadata update via Management API.');
  };

  const isGuest = !auth0User;

  return (
    <AuthReactContext.Provider value={{ user, isLoading, isGuest, login, logout, switchTenant }}>
      {children}
    </AuthReactContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthReactContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
