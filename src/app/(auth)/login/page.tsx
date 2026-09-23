"use client";

// =============================================================================
// EBRR Platform Login Page — Auth0 Universal Login (v4 routes)
// Redirects to /auth/login which is handled by Auth0 SDK middleware.
// Auth0 handles credentials, MFA, SSO — we handle the redirect back.
// =============================================================================

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import {
  Scale,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Lock,
  Building2,
} from "lucide-react";
import { Button } from "../../../components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 shadow-lg shadow-blue-500/20 mb-2">
            <Scale className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            EBRR Platform
          </h1>
          <p className="text-xs text-muted-foreground">
            Evidence-Based Responsibility Reconstruction™ Investigation Hub
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-border/80 bg-card/70 p-6 shadow-xl backdrop-blur-md space-y-5">
          {/* Security Badge */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/20">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-300">
                Enterprise-Grade Security
              </p>
              <p className="text-[11px] text-muted-foreground">
                Powered by Auth0 · MFA · SSO · SOC 2 compliant session
                management
              </p>
            </div>
          </div>

          {/* Sign-in CTA — plain <a> tag to avoid Next.js prefetch triggering auth flow */}
          <a href="/auth/login">
            <Button className="w-full h-10 text-sm font-semibold gap-2 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">
              <Lock className="h-4 w-4" />
              <span>Sign in to Investigations</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </a>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {[
              {
                icon: Building2,
                label: "Multi-Tenant Isolation",
                desc: "Row-level Neo4j security",
              },
              {
                icon: Sparkles,
                label: "AI Graph Engine",
                desc: "React Flow + Neo4j AuraDB",
              },
              {
                icon: ShieldCheck,
                label: "Compliance Ready",
                desc: "EBRR investigation standard",
              },
              {
                icon: Lock,
                label: "JWT Sessions",
                desc: "Auth0 RS256 signed tokens",
              },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="p-2.5 rounded-lg border border-border/50 bg-background/30 space-y-0.5"
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-primary" />
                  <span className="text-[11px] font-semibold text-foreground">
                    {label}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground pl-4">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          New to EBRR?{" "}
          <Link
            href="/signup"
            className="text-primary hover:underline font-medium"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
