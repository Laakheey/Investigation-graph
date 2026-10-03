"use client";

// =============================================================================
// EBRR Matter Creation Workflow — /investigations/new
// Structured matter intake form styled strictly to the EBRR specification.
// Includes localStorage draft persistence across Auth0 login flows.
// =============================================================================

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Cpu,
  Calendar,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  LogIn,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import TopNavigation from "@/components/investigations/TopNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/AuthProvider";
import { CONDUCT_TYPES, type ConductType } from "@/lib/ebrrConstants";

const DRAFT_STORAGE_KEY = "ebrr_investigation_draft_v1";

interface InvestigationDraft {
  name: string;
  description: string;
  conductType: ConductType;
  startDate: string;
  endDate: string;
  consequentialConduct: string;
  knownPeopleOrgs: string;
  knownAiSystems: string;
}

export default function NewInvestigationPage() {
  const router = useRouter();
  const { user, isGuest, isLoading: isAuthLoading } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conductType, setConductType] =
    useState<ConductType>("Ongoing practice");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [consequentialConduct, setConsequentialConduct] = useState("");
  const [knownPeopleOrgs, setKnownPeopleOrgs] = useState("");
  const [knownAiSystems, setKnownAiSystems] = useState("");

  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── 1. Restore draft from localStorage on mount ────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<InvestigationDraft>;
        let restored = false;
        if (draft.name) {
          setName(draft.name);
          restored = true;
        }
        if (draft.description) {
          setDescription(draft.description);
          restored = true;
        }
        if (draft.conductType) setConductType(draft.conductType);
        if (draft.startDate) setStartDate(draft.startDate);
        if (draft.endDate) setEndDate(draft.endDate);
        if (draft.consequentialConduct) {
          setConsequentialConduct(draft.consequentialConduct);
          restored = true;
        }
        if (draft.knownPeopleOrgs) setKnownPeopleOrgs(draft.knownPeopleOrgs);
        if (draft.knownAiSystems) setKnownAiSystems(draft.knownAiSystems);
        if (restored) setHasDraftRestored(true);
      }
    } catch (err) {
      console.error("Failed to load draft from localStorage:", err);
    }
  }, []);

  // ── 2. Automatically save draft to localStorage on change ──────────────────
  useEffect(() => {
    // Only save if there's any non-empty input
    if (
      name ||
      description ||
      startDate ||
      endDate ||
      consequentialConduct ||
      knownPeopleOrgs ||
      knownAiSystems
    ) {
      const draft: InvestigationDraft = {
        name,
        description,
        conductType,
        startDate,
        endDate,
        consequentialConduct,
        knownPeopleOrgs,
        knownAiSystems,
      };
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch (err) {
        console.error("Failed to save draft:", err);
      }
    }
  }, [
    name,
    description,
    conductType,
    startDate,
    endDate,
    consequentialConduct,
    knownPeopleOrgs,
    knownAiSystems,
  ]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setName("");
      setDescription("");
      setConductType("Ongoing practice");
      setStartDate("");
      setEndDate("");
      setConsequentialConduct("");
      setKnownPeopleOrgs("");
      setKnownAiSystems("");
      setHasDraftRestored(false);
    } catch (err) {
      console.error("Failed to clear draft:", err);
    }
  };

  const handleSignInToSubmit = () => {
    // Explicitly persist latest draft before redirecting
    const draft: InvestigationDraft = {
      name,
      description,
      conductType,
      startDate,
      endDate,
      consequentialConduct,
      knownPeopleOrgs,
      knownAiSystems,
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {}
    window.location.href = "/auth/login?returnTo=/investigations/new";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setError("Please provide a matter name and description.");
      return;
    }

    // Guard: If guest user attempts submit, prompt login
    if (isGuest) {
      handleSignInToSubmit();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formattedDateRange = startDate
      ? endDate
        ? `${startDate} to ${endDate}`
        : startDate
      : undefined;

    try {
      const res = await fetch("/api/investigations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          conductType,
          dateRange: formattedDateRange,
          consequentialConduct: consequentialConduct.trim() || undefined,
          knownPeopleOrgs: knownPeopleOrgs.trim() || undefined,
          knownAiSystems: knownAiSystems.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || "Failed to create matter");
      }

      // Clear draft upon successful creation
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      // Redirect directly to the newly created Reconstruction Canvas
      router.push(`/investigations/${json.data.id}/graph`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during creation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedConductConfig =
    CONDUCT_TYPES.find((c) => c.value === conductType) || CONDUCT_TYPES[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNavigation />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Back Link & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to dashboard</span>
            </Link>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              New Investigation
            </h2>
            <p className="text-xs text-muted-foreground">
              Initiate a structured Evidence-Based Responsibility Reconstruction™
              matter.
            </p>
          </div>

          {/* Draft Restored Indicator & Clear Action */}
          {hasDraftRestored && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Draft restored from storage
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearDraft}
                className="h-7 text-[11px] text-muted-foreground hover:text-destructive gap-1 px-2"
                title="Discard saved draft and reset fields"
              >
                <RotateCcw className="h-3 w-3" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Guest Demo Mode Notice Banner */}
        {isGuest && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-foreground">
                Guest Mode — Form Draft Auto-Saved
              </p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                You can draft your entire investigation below. Form fields are automatically saved in local storage. When you click <strong>Sign In to Submit</strong>, your inputs will be preserved across Auth0 login and ready for instant submission.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleSignInToSubmit}
              className="h-8 text-xs bg-[#1E3A8A] hover:bg-[#1E40AF] text-white font-medium shrink-0 gap-1.5 shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </Button>
          </div>
        )}

        {/* Structured Form Container */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Matter Name */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Matter Name *</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  e.g., "Automated benefits eligibility denials"
                </span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Matter Title..."
                required
                className="mt-1.5 text-xs bg-background"
              />
            </div>

            {/* 2. Matter Description */}
            <div>
              <label className="text-xs font-semibold text-foreground">
                Matter Description *
              </label>
              <p className="text-[11px] text-muted-foreground mb-1.5">
                Plain-language description of the concern or allegations.
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the core factual allegations, affected populations, or scope of inquiry..."
                required
                rows={3}
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* 3. Conduct Type — Clean Select Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Conduct Type *</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  EBRR Responsibility Pattern
                </span>
              </label>
              <select
                value={conductType}
                onChange={(e) => setConductType(e.target.value as ConductType)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CONDUCT_TYPES.map((typeOption) => (
                  <option key={typeOption.value} value={typeOption.value}>
                    {typeOption.label} — {typeOption.description}
                  </option>
                ))}
              </select>
              {selectedConductConfig && (
                <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-lg border border-border/70 bg-muted/40 text-[11px]">
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-mono ${selectedConductConfig.badgeClass}`}
                  >
                    {selectedConductConfig.value}
                  </Badge>
                  <span className="text-muted-foreground">
                    {selectedConductConfig.description}
                  </span>
                </div>
              )}
            </div>

            {/* 4. Consequential Conduct Calendar Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>Consequential Conduct Date *</span>
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Exact calendar date or incident range
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-muted-foreground mb-1 block">
                    Incident / Effective Date
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground mb-1 block">
                    End Date (for ongoing practice or window)
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 5. Consequential Conduct Narrative */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                <span>Consequential Conduct Narrative</span>
              </label>
              <p className="text-[11px] text-muted-foreground mb-1.5">
                Describe the specific occurrence, practice, or adverse impact
                under review.
              </p>
              <textarea
                value={consequentialConduct}
                onChange={(e) => setConsequentialConduct(e.target.value)}
                placeholder="What was the harm, termination, adverse decision, or downstream consequence?"
                rows={3}
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* 6. Known People and Organizations */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  <span>Known People and Organizations</span>
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Comma-separated
                </span>
              </label>
              <Input
                value={knownPeopleOrgs}
                onChange={(e) => setKnownPeopleOrgs(e.target.value)}
                placeholder="e.g. State Dept of Human Services, Apex Systems Integration, David Vance"
                className="mt-1.5 text-xs bg-background"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Entities entered here will automatically be seeded as initial
                nodes on your reconstruction canvas.
              </p>
            </div>

            {/* 7. Known AI Systems */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-sky-500" />
                  <span>Known AI Systems</span>
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Comma-separated
                </span>
              </label>
              <Input
                value={knownAiSystems}
                onChange={(e) => setKnownAiSystems(e.target.value)}
                placeholder="e.g. ClaimScorer Pro v2.4, EligibilityInference Engine"
                className="mt-1.5 text-xs bg-background"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                AI systems will be mapped as distinct Decision System elements
                with connection anchors.
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
              <Link href="/dashboard">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Cancel
                </Button>
              </Link>

              {isGuest ? (
                <Button
                  type="button"
                  onClick={handleSignInToSubmit}
                  className="h-9 px-5 text-xs font-semibold gap-1.5 bg-[#1E3A8A] hover:bg-[#1E40AF] text-white shadow-md cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In to Submit Investigation</span>
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || !description.trim()}
                  className="h-9 px-5 text-xs font-semibold gap-1.5 bg-[#1E3A8A] hover:bg-[#1E40AF] text-white shadow-md cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating Matter & Seeding Canvas...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Investigation</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
