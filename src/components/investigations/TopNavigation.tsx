'use client';

// =============================================================================
// EBRR Global Top Navigation — Auth0 v4 Session Aware
// Shows authenticated user's name/avatar from Auth0 useUser() hook.
// Login  → /auth/login   (Auth0 Universal Login)
// Logout → /auth/logout  (clears session, redirects to /auth/logout)
// =============================================================================

import React from 'react';
import Link from 'next/link';
import { Scale, Plus, Building2, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { useUser } from '@auth0/nextjs-auth0/client';
import { ThemeToggle } from '../theme/ThemeToggle';

const NS = 'https://ebrr.app';

export default function TopNavigation() {
  const { user, isLoading } = useUser();

  const tenantName: string =
    (user?.[`${NS}/tenantName`] as string) ||
    user?.email?.split('@')[1]?.split('.')[0] ||
    'My Organization';

  const displayName: string = user?.name ?? user?.nickname ?? user?.email ?? 'Investigator';
  const initials = displayName.slice(0, 1).toUpperCase();
  const avatarSrc = user?.picture;

  return (
    <header className="border-b border-border/80 bg-card/70 backdrop-blur-md px-6 py-3.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">

        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-[#1E3A8A] to-blue-600 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">EBRR Investigations</h1>
              <p className="text-[11px] text-muted-foreground">
                Evidence-Based Responsibility Reconstruction™
              </p>
            </div>
          </Link>
        </div>

        {/* Right: Tenant badge, ThemeToggle, User, CTA */}
        <div className="flex items-center gap-3">

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Tenant Badge */}
          {!isLoading && user && (
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-1 text-xs">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-foreground">{tenantName}</span>
              {/* ShieldCheck without unsupported title prop */}
              <span title="Tenant isolated">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
              </span>
            </div>
          )}

          {/* User Profile */}
          <div className="flex items-center gap-2 text-xs border-l border-border/70 pl-3">
            {isLoading ? (
              <div className="h-6 w-16 animate-pulse rounded bg-muted" />
            ) : user ? (
              <>
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                      {initials}
                    </div>
                  )}
                  <span className="hidden md:inline text-foreground">{displayName}</span>
                </div>

                {/* Logout — plain <a> to avoid prefetch issues */}
                <a href="/auth/logout">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    aria-label="Sign Out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </>
            ) : (
              <a href="/auth/login">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Sign in
                </Button>
              </a>
            )}
          </div>

          {/* + New Investigation CTA */}
          <Link href="/investigations/new">
            <Button
              size="sm"
              className="h-8 px-3.5 text-xs font-semibold gap-1.5 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New investigation</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
