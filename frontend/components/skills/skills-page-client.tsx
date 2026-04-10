"use client";

import { useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import { Badge } from "@/components/ui/badge";
import { Card, SubtleCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/cn";

type SkillField = {
  key: string;
  label: string;
  valueType: string;
  required: boolean;
  description: string;
};

type SkillCompatibilityReport = {
  target: "claude_code" | "codex";
  status: "native" | "partial" | "incompatible";
  summary: string;
  missingCapabilities: string[];
};

type SkillDefinition = {
  skillKey: string;
  label: string;
  description: string;
  inputSchema: SkillField[];
  outputSchema: SkillField[];
  supportedValueTypes: string[];
  sideEffects: string[];
  sourceFormat: "graphite_definition" | "claude_code" | "codex";
  runtimeRegistered: boolean;
  compatibility: SkillCompatibilityReport[];
};

const COMPATIBILITY_LABELS: Record<SkillCompatibilityReport["status"], string> = {
  native: "原生",
  partial: "部分兼容",
  incompatible: "不兼容",
};

const FORMAT_LABELS: Record<SkillDefinition["sourceFormat"], string> = {
  graphite_definition: "Graphite 定义",
  claude_code: "Claude Code",
  codex: "Codex",
};

export function SkillsPageClient() {
  const { t } = useLanguage();
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [selectedSkillKey, setSelectedSkillKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSkills() {
      try {
        const payload = await apiGet<SkillDefinition[]>("/api/skills/definitions");
        if (!cancelled) {
          setSkills(payload);
          setSelectedSkillKey((current) => current ?? payload[0]?.skillKey ?? null);
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load skills.");
        }
      }
    }
    loadSkills();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSkills = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return skills;
    }
    return skills.filter((skill) =>
      [skill.skillKey, skill.label, skill.description, ...skill.sideEffects, ...skill.supportedValueTypes]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [search, skills]);

  const selectedSkill =
    filteredSkills.find((skill) => skill.skillKey === selectedSkillKey) ??
    skills.find((skill) => skill.skillKey === selectedSkillKey) ??
    filteredSkills[0] ??
    null;

  const totalCompatibilityGaps = selectedSkill?.compatibility.reduce(
    (count, report) => count + report.missingCapabilities.length,
    0,
  ) ?? 0;

  if (error) {
    return <EmptyState>{t("common.failed")}: {error}</EmptyState>;
  }

  if (!skills.length) {
    return <EmptyState>{t("common.loading")}</EmptyState>;
  }

  return (
    <div className="grid gap-6">
      <section className="grid grid-cols-4 gap-[18px] max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
        <MetricCard title="技能总数" value={String(skills.length)} detail="当前后端已登记的 skill definitions" />
        <MetricCard
          title="已注册运行时"
          value={String(skills.filter((skill) => skill.runtimeRegistered).length)}
          detail="具备后端实际可执行实现"
        />
        <MetricCard
          title="Claude 部分兼容"
          value={String(skills.filter((skill) => skill.compatibility.some((item) => item.target === "claude_code" && item.status === "partial")).length)}
          detail="已接近 Claude Code skill 语义"
        />
        <MetricCard
          title="Codex 部分兼容"
          value={String(skills.filter((skill) => skill.compatibility.some((item) => item.target === "codex" && item.status === "partial")).length)}
          detail="已接近 Codex skill 语义"
        />
      </section>

      <section className="grid grid-cols-[360px_minmax(0,1fr)] gap-6 max-[1100px]:grid-cols-1">
        <Card className="grid gap-4">
          <div>
            <div className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">Skill Registry</div>
            <h2 className="mt-2 text-2xl font-semibold">已登记技能</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              先把当前 skill 看清楚，再决定哪些要原生支持 Claude Code 或 Codex 格式。
            </p>
          </div>

          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索 skill key、描述、side effect" />

          <div className="grid gap-3">
            {filteredSkills.map((skill) => {
              const isActive = selectedSkill?.skillKey === skill.skillKey;
              return (
                <button
                  key={skill.skillKey}
                  type="button"
                  onClick={() => setSelectedSkillKey(skill.skillKey)}
                  className={cn(
                    "rounded-[20px] border px-4 py-3 text-left transition-colors",
                    isActive
                      ? "border-[rgba(154,52,18,0.35)] bg-[rgba(255,250,241,0.98)]"
                      : "border-[rgba(154,52,18,0.14)] bg-[rgba(255,255,255,0.72)] hover:bg-[rgba(255,250,241,0.92)]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-[var(--text)]">{skill.label}</div>
                      <div className="mt-1 truncate text-xs uppercase tracking-[0.08em] text-[var(--muted)]">{skill.skillKey}</div>
                    </div>
                    <Badge className={cn(skill.runtimeRegistered ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                      {skill.runtimeRegistered ? "已注册" : "未注册"}
                    </Badge>
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{skill.description}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{FORMAT_LABELS[skill.sourceFormat]}</Badge>
                    {skill.sideEffects.slice(0, 2).map((item) => (
                      <Badge key={item}>{item}</Badge>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {selectedSkill ? (
          <div className="grid gap-6">
            <Card className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">Skill Detail</div>
                  <h2 className="mt-2 text-2xl font-semibold">{selectedSkill.label}</h2>
                  <div className="mt-1 text-sm uppercase tracking-[0.08em] text-[var(--muted)]">{selectedSkill.skillKey}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{FORMAT_LABELS[selectedSkill.sourceFormat]}</Badge>
                  <Badge className={cn(selectedSkill.runtimeRegistered ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                    {selectedSkill.runtimeRegistered ? "Runtime 已注册" : "Runtime 未注册"}
                  </Badge>
                </div>
              </div>

              <p className="text-[0.98rem] leading-7 text-[var(--muted)]">{selectedSkill.description}</p>

              <div className="grid grid-cols-3 gap-4 max-[960px]:grid-cols-1">
                <SubtleCard>
                  <div className="text-sm font-semibold text-[var(--text)]">输入字段</div>
                  <div className="mt-2 text-3xl font-semibold">{selectedSkill.inputSchema.length}</div>
                </SubtleCard>
                <SubtleCard>
                  <div className="text-sm font-semibold text-[var(--text)]">输出字段</div>
                  <div className="mt-2 text-3xl font-semibold">{selectedSkill.outputSchema.length}</div>
                </SubtleCard>
                <SubtleCard>
                  <div className="text-sm font-semibold text-[var(--text)]">兼容缺口</div>
                  <div className="mt-2 text-3xl font-semibold">{totalCompatibilityGaps}</div>
                </SubtleCard>
              </div>
            </Card>

            <section className="grid grid-cols-2 gap-6 max-[960px]:grid-cols-1">
              <SchemaCard title="Input Schema" emptyLabel="当前没有输入字段。" fields={selectedSkill.inputSchema} />
              <SchemaCard title="Output Schema" emptyLabel="当前没有输出字段。" fields={selectedSkill.outputSchema} />
            </section>

            <section className="grid grid-cols-2 gap-6 max-[960px]:grid-cols-1">
              <Card className="grid gap-3">
                <div className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">Value Types</div>
                <div className="flex flex-wrap gap-2">
                  {selectedSkill.supportedValueTypes.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              </Card>
              <Card className="grid gap-3">
                <div className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">Side Effects</div>
                <div className="flex flex-wrap gap-2">
                  {selectedSkill.sideEffects.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              </Card>
            </section>

            <Card className="grid gap-4">
              <div className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">Compatibility</div>
              <div className="grid gap-4">
                {selectedSkill.compatibility.map((report) => (
                  <div key={report.target} className="rounded-[20px] border border-[rgba(154,52,18,0.14)] bg-[rgba(255,255,255,0.72)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-lg font-semibold text-[var(--text)]">
                        {report.target === "claude_code" ? "Claude Code" : "Codex"}
                      </div>
                      <Badge>{COMPATIBILITY_LABELS[report.status]}</Badge>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{report.summary}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {report.missingCapabilities.map((item) => (
                        <Badge key={item}>{item}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <EmptyState>没有匹配的 skill。</EmptyState>
        )}
      </section>
    </div>
  );
}

function MetricCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card>
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</div>
    </Card>
  );
}

function SchemaCard({ title, emptyLabel, fields }: { title: string; emptyLabel: string; fields: SkillField[] }) {
  return (
    <Card className="grid gap-4">
      <div className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--accent-strong)]">{title}</div>
      {fields.length > 0 ? (
        <div className="grid gap-3">
          {fields.map((field) => (
            <div key={field.key} className="rounded-[18px] border border-[rgba(154,52,18,0.14)] bg-[rgba(255,255,255,0.72)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-base font-semibold text-[var(--text)]">{field.label}</div>
                <Badge>{field.key}</Badge>
                <Badge>{field.valueType}</Badge>
                {field.required ? <Badge className="text-[var(--danger)]">required</Badge> : null}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{field.description || "暂无描述。"}</div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState>{emptyLabel}</EmptyState>
      )}
    </Card>
  );
}
