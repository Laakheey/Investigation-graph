"use client";

// =============================================================================
// EBRR Matter Creation Workflow — /investigations/new
// Structured matter intake form styled strictly to the EBRR specification
// =============================================================================

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Scale,
  Sparkles,
  HelpCircle,
  Users,
  Cpu,
  Calendar,
  FileText,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import TopNavigation from "@/components/investigations/TopNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CONDUCT_TYPES, type ConductType } from "@/lib/ebrrConstants";

export default function NewInvestigationPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conductType, setConductType] =
    useState<ConductType>("Ongoing practice");
  const [dateRange, setDateRange] = useState("");
  const [consequentialConduct, setConsequentialConduct] = useState("");
  const [knownPeopleOrgs, setKnownPeopleOrgs] = useState("");
  const [knownAiSystems, setKnownAiSystems] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setError("Please provide a matter name and description.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/investigations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          conductType,
          dateRange: dateRange.trim() || undefined,
          consequentialConduct: consequentialConduct.trim() || undefined,
          knownPeopleOrgs: knownPeopleOrgs.trim() || undefined,
          knownAiSystems: knownAiSystems.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || "Failed to create matter");
      }

      // Redirect directly to the newly created Reconstruction Canvas
      router.push(`/investigations/${json.data.id}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during creation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNavigation />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Back Link & Header */}
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

        {/* Structured Form Container */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 md:p-8 shadow-xl backdrop-blur-md">
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
                className="mt-1.5 text-xs bg-background/50"
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
                className="w-full rounded-md border border-input bg-background/50 p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* 3. Conduct Type */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                <span>Conduct Type *</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {CONDUCT_TYPES.map((typeOption) => {
                  const isSelected = conductType === typeOption.value;
                  return (
                    <button
                      key={typeOption.value}
                      type="button"
                      onClick={() => setConductType(typeOption.value)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background/30 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-foreground">
                          {typeOption.label}
                        </span>
                        {isSelected && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-primary text-primary"
                          >
                            Selected
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {typeOption.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Consequential Conduct Date or Date Range */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>Consequential Conduct Date or Date Range</span>
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  e.g., "Q1 2024"
                </span>
              </label>
              <Input
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                placeholder="Specific date or estimated timeframe..."
                className="mt-1.5 text-xs bg-background/50"
              />
            </div>

            {/* 5. Consequential Conduct */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                <span>Consequential Conduct</span>
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
                className="w-full rounded-md border border-input bg-background/50 p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* 6. Known People and Organizations */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-400" />
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
                className="mt-1.5 text-xs bg-background/50"
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
                  <Cpu className="h-3.5 w-3.5 text-sky-400" />
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
                className="mt-1.5 text-xs bg-background/50"
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
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim() || !description.trim()}
                className="h-9 px-5 text-xs font-semibold gap-1.5 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white shadow-md"
              >
                <span>
                  {isSubmitting
                    ? "Creating Matter & Seeding Canvas..."
                    : "Create investigation"}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
