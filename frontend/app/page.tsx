"use client";

import Link from "next/link";

import { useLanguage } from "@/components/providers/language-provider";
import { SectionHeader } from "@/components/ui/section-header";
import { WorkspaceDashboardClient } from "@/components/workspace/workspace-dashboard-client";

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(255,250,241,0.92),rgba(246,211,184,0.8))] p-6 shadow-[0_20px_60px_var(--shadow)]">
        <SectionHeader eyebrow={t("home.eyebrow")} title={t("home.title")} description={t("home.desc")} />
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="inline-flex items-center justify-center rounded-[14px] border border-[var(--accent)] bg-[var(--accent)] px-[18px] py-3 text-white transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_12px_24px_rgba(154,52,18,0.18)]" href="/editor/new">
            {t("workspace.create_graph")}
          </Link>
          <Link className="inline-flex items-center justify-center rounded-[14px] border border-[var(--accent)] bg-transparent px-[18px] py-3 text-[var(--accent-strong)] transition-all duration-200 ease-out hover:-translate-y-px hover:bg-[rgba(255,255,255,0.72)]" href="/editor">
            {t("home.open_editor")}
          </Link>
        </div>
      </section>

      <WorkspaceDashboardClient />
    </div>
  );
}
