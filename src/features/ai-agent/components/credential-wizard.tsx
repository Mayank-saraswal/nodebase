"use client";

import { useState } from "react";
import type { CredentialRequirement } from "../schemas/workflow-generation";

interface CredentialWizardProps {
  requirements: CredentialRequirement[];
  onComplete?:  () => void;
  className?:   string;
}

const SETUP_GUIDES: Partial<Record<string, string>> = {
  RAZORPAY:      "https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/",
  WHATSAPP:      "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
  OPENAI:        "https://platform.openai.com/api-keys",
  ANTHROPIC:     "https://console.anthropic.com/settings/keys",
  GEMINI:        "https://aistudio.google.com/app/apikey",
  SLACK:         "https://api.slack.com/apps",
  HUBSPOT:       "https://developers.hubspot.com/docs/api/private-apps",
  ZOHO_CRM:      "https://www.zoho.com/crm/developer/docs/api/v6/oauth-overview.html",
  GITHUB:        "https://github.com/settings/tokens",
  GOOGLE_SHEETS: "https://console.cloud.google.com/apis/credentials",
  MSG91:         "https://control.msg91.com/signin/",
  NOTION:        "https://www.notion.so/my-integrations",
  CASHFREE:      "https://merchant.cashfree.com/merchants/apps/pg",
  SHIPROCKET:    "https://apiv2.shiprocket.in/",
  FRESHDESK:     "https://support.freshdesk.com/en/support/solutions/articles/215517",
};

export function CredentialWizard({ requirements, onComplete, className }: CredentialWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const pending   = requirements.filter((r) => !r.isConfigured);
  const completed = requirements.filter((r) => r.isConfigured);

  if (pending.length === 0) {
    return (
      <div className={`rounded-xl border border-green-500/30 bg-green-500/10 p-5 text-center ${className ?? ""}`}>
        <div className="text-2xl mb-2">✅</div>
        <p className="font-semibold text-green-700 dark:text-green-400">All credentials configured!</p>
        <p className="text-sm text-muted-foreground mt-1">Your workflow is ready to run.</p>
        {onComplete && (
          <button
            type="button"
            onClick={onComplete}
            className="mt-3 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Activate Workflow
          </button>
        )}
      </div>
    );
  }

  const current = pending[currentStep];

  return (
    <div className={`rounded-xl border border-border bg-card p-5 space-y-4 ${className ?? ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Set Up Credentials</h3>
        <span className="text-xs text-muted-foreground">
          {currentStep + 1} / {pending.length}
        </span>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {pending.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < currentStep ? "bg-primary" : i === currentStep ? "bg-primary/60" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Current credential */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-mono font-bold text-primary">
            {current.type}
          </span>
          <span className="text-sm font-medium">{current.nodeName}</span>
        </div>
        <p className="text-sm text-muted-foreground">{current.purpose}</p>

        {(SETUP_GUIDES[current.type] ?? current.setupUrl) && (
          <a
            href={SETUP_GUIDES[current.type] ?? current.setupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            📖 Setup guide for {current.type} →
          </a>
        )}

        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          Go to <strong>Settings → Credentials</strong> and add your <strong>{current.type}</strong> credential,
          then come back and select it in the node configuration.
        </div>
      </div>

      {/* Completed credentials */}
      {completed.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Already configured:</p>
          {completed.map((c, i) => (
            <p key={i} className="text-xs text-green-600 dark:text-green-400">
              ✓ {c.type} — {c.nodeName}
            </p>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-2">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => s - 1)}
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            ← Previous
          </button>
        )}
        {currentStep < pending.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => s + 1)}
            className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Next →
          </button>
        ) : (
          onComplete && (
            <button
              type="button"
              onClick={onComplete}
              className="flex-1 rounded-md bg-green-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Done — Activate Workflow
            </button>
          )
        )}
      </div>
    </div>
  );
}
