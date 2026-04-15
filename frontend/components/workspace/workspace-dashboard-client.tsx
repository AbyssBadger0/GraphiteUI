"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, SubtleCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { apiGet } from "@/lib/api";
import { useLanguage } from "@/components/providers/language-provider";
import type { CanonicalGraphPayload, CanonicalTemplateRecord } from "@/lib/node-system-canonical";
import type { GraphSummary, RunSummary, TemplateSummary } from "@/lib/types";

export function WorkspaceDashboardClient() {
  const { t } = useLanguage();
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        const [graphPayload, runPayload, templatePayload] = await Promise.all([
          apiGet<CanonicalGraphPayload[]>("/api/graphs"),
          apiGet<RunSummary[]>("/api/runs"),
          apiGet<CanonicalTemplateRecord[]>("/api/templates"),
        ]);
        if (!cancelled) {
          setGraphs(
            graphPayload.map((graph) => {
              return {
                graph_id: graph.graph_id ?? "",
                name: graph.name,
                node_count: Object.keys(graph.nodes).length,
                edge_count: graph.edges.length + graph.conditional_edges.reduce((count, entry) => count + Object.keys(entry.branches).length, 0),
              } satisfies GraphSummary;
            }),
          );
          setRuns(runPayload);
          setTemplates(
            templatePayload.map((template) => ({
              template_id: template.template_id,
              label: template.label,
              description: template.description,
            }) satisfies TemplateSummary),
          );
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load workspace data.");
        }
      }
    }
    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <Card>{t("common.failed")}: {error}</Card>;
  }

  return (
    <section className="grid grid-cols-12 gap-[18px] max-[960px]:grid-cols-1">
      <Card className="col-span-4 max-[960px]:col-span-1">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="mb-2.5">{t("common.recent_runs")}</h2>
          <Link className="text-xs uppercase tracking-[0.08em] text-[var(--accent-strong)] transition-colors duration-200 hover:text-[var(--accent)]" href="/runs">
            {t("workspace.view_runs")}
          </Link>
        </div>
        <div className="grid gap-3">
          {runs.length === 0 ? (
            <EmptyState>
              <div className="grid gap-3">
                <div>{t("home.empty_runs")}</div>
                <Link className="inline-flex w-fit items-center justify-center rounded-[12px] border border-[var(--accent)] bg-[rgba(255,255,255,0.82)] px-3.5 py-2 text-sm text-[var(--accent-strong)] transition-all duration-200 hover:-translate-y-px hover:border-[var(--accent)] hover:bg-white" href="/editor">
                  {t("home.open_editor")}
                </Link>
              </div>
            </EmptyState>
          ) : (
            runs.slice(0, 5).map((run) => (
              <Link className="block cursor-pointer" href={`/runs/${run.run_id}`} key={run.run_id}>
                <SubtleCard className="transition-all duration-200 ease-out hover:-translate-y-px hover:border-[rgba(154,52,18,0.28)] hover:bg-[rgba(255,255,255,0.82)]">
                  <div className="flex items-start justify-between gap-3">
                    <strong>{run.run_id}</strong>
                    <span className="text-xs uppercase tracking-[0.08em] text-[var(--accent-strong)]">{t("common.open_detail")}</span>
                  </div>
                  <div className="text-[var(--muted)]">{run.graph_name}</div>
                  <div className="mt-2 flex flex-wrap gap-2.5">
                    <Badge>{run.status}</Badge>
                    <Badge>revisions {run.revision_round}</Badge>
                  </div>
                </SubtleCard>
              </Link>
            ))
          )}
        </div>
      </Card>

      <Card className="col-span-4 max-[960px]:col-span-1">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="mb-2.5">{t("home.templates")}</h2>
          <Link className="text-xs uppercase tracking-[0.08em] text-[var(--accent-strong)] transition-colors duration-200 hover:text-[var(--accent)]" href="/editor">
            {t("home.more_templates")}
          </Link>
        </div>
        <div className="grid gap-3">
          {templates.length === 0 ? (
            <EmptyState>
              <div className="grid gap-3">
                <div>{t("home.empty_templates")}</div>
                <Link className="inline-flex w-fit items-center justify-center rounded-[12px] border border-[var(--accent)] bg-[rgba(255,255,255,0.82)] px-3.5 py-2 text-sm text-[var(--accent-strong)] transition-all duration-200 hover:-translate-y-px hover:border-[var(--accent)] hover:bg-white" href="/editor">
                  {t("home.more_templates")}
                </Link>
              </div>
            </EmptyState>
          ) : (
            templates.slice(0, 3).map((template) => (
              <Link className="block cursor-pointer" href={`/editor/new?template=${template.template_id}`} key={template.template_id}>
                <SubtleCard className="transition-all duration-200 ease-out hover:-translate-y-px hover:border-[rgba(154,52,18,0.28)] hover:bg-[rgba(255,255,255,0.82)]">
                  <div className="text-xs uppercase tracking-[0.08em] text-[var(--accent-strong)]">{template.template_id}</div>
                  <div className="mt-1 font-semibold text-[var(--text)]">{template.label}</div>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{template.description}</p>
                </SubtleCard>
              </Link>
            ))
          )}
        </div>
      </Card>

      <Card className="col-span-4 max-[960px]:col-span-1">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="mb-2.5">{t("common.recent_graphs")}</h2>
          <Link className="text-xs uppercase tracking-[0.08em] text-[var(--accent-strong)] transition-colors duration-200 hover:text-[var(--accent)]" href="/editor">
            {t("home.open_editor")}
          </Link>
        </div>
        <div className="grid gap-3">
          {graphs.length === 0 ? (
            <EmptyState>
              <div className="grid gap-3">
                <div>{t("home.empty_graphs")}</div>
                <Link className="inline-flex w-fit items-center justify-center rounded-[12px] border border-[var(--accent)] bg-[rgba(255,255,255,0.82)] px-3.5 py-2 text-sm text-[var(--accent-strong)] transition-all duration-200 hover:-translate-y-px hover:border-[var(--accent)] hover:bg-white" href="/editor/new">
                  {t("workspace.create_graph")}
                </Link>
              </div>
            </EmptyState>
          ) : (
            graphs.slice(0, 5).map((graph) => (
              <Link className="block cursor-pointer" href={`/editor/${graph.graph_id}`} key={graph.graph_id}>
                <SubtleCard className="transition-all duration-200 ease-out hover:-translate-y-px hover:border-[rgba(154,52,18,0.28)] hover:bg-[rgba(255,255,255,0.82)]">
                  <div className="flex items-start justify-between gap-3">
                    <strong>{graph.name}</strong>
                    <span className="text-xs uppercase tracking-[0.08em] text-[var(--accent-strong)]">{t("common.open_detail")}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2.5">
                    <Badge>nodes {graph.node_count}</Badge>
                    <Badge>edges {graph.edge_count}</Badge>
                  </div>
                </SubtleCard>
              </Link>
            ))
          )}
        </div>
      </Card>
    </section>
  );
}
