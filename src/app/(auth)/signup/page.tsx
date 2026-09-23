"use client";

// =============================================================================
// EBRR Platform Signup Page — Auth0 Universal Login (signup screen)
// /auth/login?screen_hint=signup is handled by Auth0 SDK middleware.
// =============================================================================

import React from "react";
import Link from "next/link";
import { Scale, ArrowRight, Building2, ShieldCheck, Users } from "lucide-react";
import { Button } from "../../../components/ui/button";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 shadow-lg shadow-blue-500/20 mb-2">
            <Scale className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create Tenant Account
          </h1>
          <p className="text-xs text-muted-foreground">
            Set up an isolated EBRR workspace for your law firm or compliance
            team
          </p>
        </div>

        {/* Signup Card */}
        <div className="rounded-2xl border border-border/80 bg-card/70 p-6 shadow-xl backdrop-blur-md space-y-5">
          <div className="space-y-2">
            {[
              {
                icon: Building2,
                title: "Dedicated Tenant Workspace",
                desc: "Your data is fully isolated — Neo4j row-level security per tenant.",
              },
              {
                icon: ShieldCheck,
                title: "Auth0 Identity Management",
                desc: "Enterprise SSO, MFA, and audit logs out of the box.",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                desc: "Invite investigators and legal counsel under your organization.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-background/30"
              >
                <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA — plain <a> to avoid Next.js prefetch */}
          <a href="/auth/login?screen_hint=signup">
            <Button className="w-full h-10 text-sm font-semibold gap-2 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">
              <span>Register &amp; Create Tenant</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </a>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
