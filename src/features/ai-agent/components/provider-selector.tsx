"use client";

import { AgentAIProviderType, PROVIDER_CONFIGS } from "../config/providers";

interface ProviderSelectorProps {
  value:    AgentAIProviderType;
  onChange: (provider: AgentAIProviderType) => void;
  disabled?: boolean;
}

const PROVIDER_ICONS: Record<AgentAIProviderType, string> = {
  [AgentAIProviderType.OPENAI]:            "🟢",
  [AgentAIProviderType.CLAUDE]:            "🟠",
  [AgentAIProviderType.DIGITALOCEAN_GLM5]: "🔵",
};

export function ProviderSelector({ value, onChange, disabled }: ProviderSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground hidden sm:inline">Model:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AgentAIProviderType)}
        disabled={disabled}
        className="text-xs rounded-md border border-input bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 cursor-pointer"
      >
        {Object.values(AgentAIProviderType).map((p) => (
          <option key={p} value={p}>
            {PROVIDER_ICONS[p]} {PROVIDER_CONFIGS[p].displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
