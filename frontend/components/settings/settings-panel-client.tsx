"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoBlock } from "@/components/ui/info-block";
import { apiGet } from "@/lib/api";
import { useLanguage } from "@/components/providers/language-provider";

type SettingsPayload = {
  model: {
    text_model: string;
    text_model_ref: string;
    video_model: string;
    video_model_ref: string;
  };
  agent_runtime_defaults?: {
    model: string;
    thinking_enabled: boolean;
    temperature: number;
  };
  model_catalog?: {
    providers: Array<{
      provider_id: string;
      label: string;
      description: string;
      transport: string;
      configured: boolean;
      base_url: string;
      models: Array<{
        model_ref: string;
        label: string;
      }>;
      example_model_refs: string[];
    }>;
  };
  revision: {
    max_revision_round: number;
  };
  evaluator: {
    default_score_threshold: number;
    routes: string[];
  };
  tools: string[];
  templates: Array<{
    template_id: string;
    label: string;
    default_theme_preset: string;
  }>;
};

export function SettingsPanelClient() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const payload = await apiGet<SettingsPayload>("/api/settings");
        if (!cancelled) {
          setSettings(payload);
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load settings.");
        }
      }
    }
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <EmptyState>{t("common.failed")}: {error}</EmptyState>;
  }

  if (!settings) {
    return <EmptyState>{t("common.loading")}</EmptyState>;
  }

  return (
    <section className="grid grid-cols-12 gap-[18px] max-[960px]:grid-cols-1">
      <Card className="col-span-4 max-[960px]:col-span-1">
        <h2 className="mb-2.5">Model</h2>
        <div className="grid gap-3">
          <InfoBlock title="Text model ref">{settings.model.text_model_ref}</InfoBlock>
          <InfoBlock title="Text runtime name">{settings.model.text_model}</InfoBlock>
          <InfoBlock title="Video model ref">{settings.model.video_model_ref}</InfoBlock>
          <InfoBlock title="Video runtime name">{settings.model.video_model}</InfoBlock>
        </div>
      </Card>
      <Card className="col-span-4 max-[960px]:col-span-1">
        <h2 className="mb-2.5">Agent Runtime</h2>
        <div className="grid gap-3">
          <InfoBlock title="Default model">{settings.agent_runtime_defaults?.model ?? settings.model.text_model_ref}</InfoBlock>
          <InfoBlock title="Default thinking">{settings.agent_runtime_defaults?.thinking_enabled ? "on" : "off"}</InfoBlock>
          <InfoBlock title="Default temperature">{settings.agent_runtime_defaults?.temperature ?? 0.2}</InfoBlock>
        </div>
      </Card>
      <Card className="col-span-4 max-[960px]:col-span-1">
        <h2 className="mb-2.5">Revision & Evaluator</h2>
        <div className="grid gap-3">
          <InfoBlock title="Max revision rounds">{settings.revision.max_revision_round}</InfoBlock>
          <InfoBlock title="Threshold">{settings.evaluator.default_score_threshold}</InfoBlock>
          <InfoBlock title="Routes">{settings.evaluator.routes.join(", ")}</InfoBlock>
        </div>
      </Card>
      <Card className="col-span-12">
        <h2 className="mb-2.5">Model Providers</h2>
        <div className="grid gap-3">
          {(settings.model_catalog?.providers ?? []).map((provider) => (
            <div key={provider.provider_id} className="rounded-[18px] border border-[var(--line)] bg-[rgba(255,255,255,0.7)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold">{provider.label}</div>
                <Badge>{provider.provider_id}</Badge>
                <Badge>{provider.transport}</Badge>
                <Badge>{provider.configured ? "configured" : "planned"}</Badge>
              </div>
              <div className="mt-2 text-sm text-[var(--muted)]">{provider.description}</div>
              <div className="mt-3 text-xs text-[var(--muted)]">Base URL: {provider.base_url}</div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {provider.models.map((model) => (
                  <Badge key={model.model_ref}>{model.model_ref}</Badge>
                ))}
                {!provider.models.length
                  ? provider.example_model_refs.map((modelRef) => (
                      <Badge key={modelRef}>{modelRef}</Badge>
                    ))
                  : null}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="col-span-12">
        <h2 className="mb-2.5">Templates</h2>
        <div className="flex flex-wrap gap-2.5">
          {settings.templates.map((template) => (
            <Badge key={template.template_id}>
              {template.label} · {template.default_theme_preset}
            </Badge>
          ))}
        </div>
      </Card>
      <Card className="col-span-12">
        <h2 className="mb-2.5">Tools</h2>
        <div className="flex flex-wrap gap-2.5">
          {settings.tools.map((tool) => (
            <Badge key={tool}>
              {tool}
            </Badge>
          ))}
        </div>
      </Card>
    </section>
  );
}
