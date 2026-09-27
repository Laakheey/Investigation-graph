"use client";

// =============================================================================
// Theme Switcher Component — next-themes Integration
// -----------------------------------------------------------------------------
// Seamlessly toggles between Light, Dark, and System modes with hydration safety.
// =============================================================================

import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Avoid hydration mismatch by rendering only after mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as globalThis.Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-8 w-8 rounded-lg border border-border/70 bg-card/60 ${className || ""}`} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className={`relative ${className || ""}`} ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-2.5 gap-1.5 rounded-lg border border-border/70 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-muted/80 backdrop-blur-md transition-colors"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-blue-400" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-amber-500" />
        )}
        <span className="text-xs font-medium capitalize hidden sm:inline">
          {theme}
        </span>
        <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-xl border border-border/80 bg-card p-1 shadow-xl backdrop-blur-xl z-50 animate-in fade-in-0 zoom-in-95 duration-100">
          <button
            onClick={() => {
              setTheme("light");
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              theme === "light"
                ? "bg-primary/15 text-primary"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span>Light</span>
            </div>
            {theme === "light" && <Check className="h-3 w-3 text-primary" />}
          </button>

          <button
            onClick={() => {
              setTheme("dark");
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              theme === "dark"
                ? "bg-primary/15 text-primary"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-2">
              <Moon className="h-3.5 w-3.5 text-blue-400" />
              <span>Dark</span>
            </div>
            {theme === "dark" && <Check className="h-3 w-3 text-primary" />}
          </button>

          <button
            onClick={() => {
              setTheme("system");
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              theme === "system"
                ? "bg-primary/15 text-primary"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-2">
              <Laptop className="h-3.5 w-3.5 text-slate-400" />
              <span>System</span>
            </div>
            {theme === "system" && <Check className="h-3 w-3 text-primary" />}
          </button>
        </div>
      )}
    </div>
  );
}
