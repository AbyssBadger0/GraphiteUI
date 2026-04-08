"use client";

import { useEffect, useState } from "react";

import { apiGet } from "@/lib/api";
import { useLanguage } from "@/components/providers/language-provider";

type KnowledgeItem = {
  title: string;
  source: string;
  summary: string;
  content: string;
};

export function KnowledgeListClient() {
  const { t } = useLanguage();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadItems() {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("query", query.trim());
        const payload = await apiGet<KnowledgeItem[]>(`/api/knowledge${params.toString() ? `?${params.toString()}` : ""}`);
        if (!cancelled) {
          setItems(payload);
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load knowledge.");
        }
      }
    }
    loadItems();
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (error) {
    return <div className="list-item">{t("common.failed")}: {error}</div>;
  }

  if (items.length === 0) {
    return <div className="list-item">{t("common.no_data")}</div>;
  }

  return (
    <div className="list">
      <div className="list-item">
        <div className="field">
          <span>{t("common.search_docs")}</span>
          <input className="text-input" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>
      {items.map((item) => (
        <button
          className="list-item"
          key={`${item.source}-${item.title}`}
          onClick={() =>
            setExpandedKey((current) => (current === `${item.source}-${item.title}` ? null : `${item.source}-${item.title}`))
          }
          type="button"
        >
          <strong>{item.title}</strong>
          <div className="muted">{item.source}</div>
          <p className="muted">{item.summary}</p>
          {expandedKey === `${item.source}-${item.title}` ? <pre className="muted">{item.content}</pre> : null}
        </button>
      ))}
    </div>
  );
}
