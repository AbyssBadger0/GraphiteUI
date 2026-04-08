"use client";

import { useEffect, useState } from "react";

import { apiGet } from "@/lib/api";
import { useLanguage } from "@/components/providers/language-provider";

type MemoryItem = {
  memory_id: string;
  memory_type: string;
  summary?: string;
  details?: string;
};

export function MemoryListClient() {
  const { t } = useLanguage();
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [memoryType, setMemoryType] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadItems() {
      try {
        const params = new URLSearchParams();
        if (memoryType) params.set("memory_type", memoryType);
        const payload = await apiGet<MemoryItem[]>(`/api/memories${params.toString() ? `?${params.toString()}` : ""}`);
        if (!cancelled) {
          setItems(payload);
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load memories.");
        }
      }
    }
    loadItems();
    return () => {
      cancelled = true;
    };
  }, [memoryType]);

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
          <span>{t("common.filter_memory")}</span>
          <input className="text-input" value={memoryType} onChange={(event) => setMemoryType(event.target.value)} />
        </div>
      </div>
      {items.map((item) => (
        <button
          className="list-item"
          key={item.memory_id}
          onClick={() => setExpandedId((current) => (current === item.memory_id ? null : item.memory_id))}
          type="button"
        >
          <strong>{item.memory_type}</strong>
          <div className="muted">{item.summary || "No summary provided."}</div>
          {expandedId === item.memory_id && item.details ? <pre className="muted">{item.details}</pre> : null}
        </button>
      ))}
    </div>
  );
}
