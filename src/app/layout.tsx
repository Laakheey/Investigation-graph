// =============================================================================
// App Router Root Layout — Server Component
// Auth0Provider wraps the tree to provide useUser() in Client Components.
// AuthProvider maps Auth0 session to the application's AuthContext.
// QueryClientWrapper holds React Query client state.
// =============================================================================

import React from "react";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { AuthProvider } from "../components/auth/AuthProvider";
import { QueryClientWrapper } from "../components/auth/QueryClientWrapper";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import "./globals.css";

export const metadata = {
  title: "EBRR Investigations — Evidence-Based Responsibility Reconstruction",
  description:
    "Evidence-Based Responsibility Reconstruction™ Investigation Platform for AI and Corporate Accountability.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        {/* Auth0Provider makes useUser() available in any Client Component */}
        <Auth0Provider>
          <AuthProvider>
            <QueryClientWrapper>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                {children}
              </ThemeProvider>
            </QueryClientWrapper>
          </AuthProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
