"use client";

import { useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RefCategory = "inputs" | "response" | "skills" | "context" | "graph" | "output";

type Segment =
  | { type: "text"; content: string }
  | { type: "ref"; path: string; category: RefCategory };

export type AutocompleteOption = {
  category: string;
  label: string;
  path: string;
  valueType: string;
};

export type ReferenceTextareaProps = {
  value: string;
  onChange: (nextValue: string) => void;
  className?: string;
  placeholder?: string;
  /** Called when a # output reference is inserted — host should sync to outputBinding */
  onOutputReference?: (outputKey: string) => void;
  /** Options shown when user types @ */
  readOptions: AutocompleteOption[];
  /** Options shown when user types # */
  writeOptions: AutocompleteOption[];
};

// ---------------------------------------------------------------------------
// Reference parsing
// ---------------------------------------------------------------------------

const REF_PATTERN = /\$(inputs|response|skills|context|graph|output)(\.[a-zA-Z_]\w*)+/g;

const CATEGORY_COLORS: Record<RefCategory, { bg: string; text: string }> = {
  inputs: { bg: "rgba(37,99,235,0.12)", text: "#2563eb" },
  response: { bg: "rgba(37,99,235,0.12)", text: "#2563eb" },
  skills: { bg: "rgba(124,58,237,0.12)", text: "#7c3aed" },
  context: { bg: "rgba(15,118,110,0.12)", text: "#0f766e" },
  graph: { bg: "rgba(71,85,105,0.1)", text: "#475569" },
  output: { bg: "rgba(22,163,74,0.12)", text: "#16a34a" },
};

function parseReferences(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  REF_PATTERN.lastIndex = 0;
  while ((match = REF_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({
      type: "ref",
      path: match[0],
      category: match[1] as RefCategory,
    });
    lastIndex = REF_PATTERN.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Autocomplete popup
// ---------------------------------------------------------------------------

function AutocompletePopup({
  options,
  filterText,
  selectedIndex,
  onSelect,
}: {
  options: AutocompleteOption[];
  filterText: string;
  selectedIndex: number;
  onSelect: (option: AutocompleteOption) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const query = filterText.toLowerCase();
  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(query) || o.path.toLowerCase().includes(query)),
    [options, query],
  );

  // keep selected item scrolled into view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const active = container.querySelector("[data-active='true']") as HTMLElement | null;
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (filtered.length === 0) {
    return (
      <div className="rounded-[14px] border border-[rgba(154,52,18,0.16)] bg-[rgba(255,250,241,0.98)] px-4 py-3 text-xs text-[var(--muted)] shadow-[0_14px_32px_rgba(60,41,20,0.14)]">
        No matches
      </div>
    );
  }

  // group by category
  const groups: Record<string, AutocompleteOption[]> = {};
  for (const option of filtered) {
    (groups[option.category] ??= []).push(option);
  }

  let flatIndex = 0;

  return (
    <div
      ref={listRef}
      className="max-h-[260px] overflow-y-auto rounded-[14px] border border-[rgba(154,52,18,0.16)] bg-[rgba(255,250,241,0.98)] py-1.5 shadow-[0_14px_32px_rgba(60,41,20,0.14)]"
    >
      {Object.entries(groups).map(([category, items]) => (
        <div key={category}>
          <div className="px-3 pt-2 pb-1 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-[var(--accent-strong)]">
            {category}
          </div>
          {items.map((option) => {
            const isActive = flatIndex === selectedIndex % filtered.length;
            const currentIndex = flatIndex;
            flatIndex++;
            return (
              <button
                key={option.path}
                type="button"
                data-active={isActive}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                  isActive ? "bg-[rgba(154,52,18,0.08)] text-[var(--text)]" : "text-[var(--text)] hover:bg-[rgba(154,52,18,0.04)]",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(filtered[currentIndex]);
                }}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <span className="flex-shrink-0 rounded-full bg-[rgba(154,52,18,0.06)] px-1.5 py-px text-[0.6rem] text-[var(--muted)]">
                  {option.valueType}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReferenceTextarea
// ---------------------------------------------------------------------------

export function ReferenceTextarea({
  value,
  onChange,
  className,
  placeholder,
  onOutputReference,
  readOptions,
  writeOptions,
}: ReferenceTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // autocomplete state
  const [popup, setPopup] = useState<{
    trigger: "@" | "#";
    triggerPos: number; // selectionStart when trigger was typed
    filterText: string;
    selectedIndex: number;
  } | null>(null);

  const activeOptions = popup ? (popup.trigger === "@" ? readOptions : writeOptions) : [];

  // sync scroll
  const syncScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // close popup on outside click
  useEffect(() => {
    if (!popup) return;
    function handleClick() {
      setPopup(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popup]);

  // render overlay segments
  function renderOverlay(): ReactNode[] {
    const segments = parseReferences(value);
    return segments.map((seg, i) => {
      if (seg.type === "text") {
        // render invisible text that takes the same space
        return <span key={i} className="text-transparent">{seg.content}</span>;
      }
      const colors = CATEGORY_COLORS[seg.category];
      return (
        <span
          key={i}
          className="rounded px-0.5"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {seg.path}
        </span>
      );
    });
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const nextValue = event.target.value;
    const cursorPos = event.target.selectionStart;
    onChange(nextValue);

    // check for trigger character
    if (popup) {
      // update filter text while popup is open
      const textAfterTrigger = nextValue.slice(popup.triggerPos + 1, cursorPos);
      if (textAfterTrigger.includes(" ") || textAfterTrigger.includes("\n") || cursorPos <= popup.triggerPos) {
        setPopup(null);
      } else {
        setPopup((prev) => prev ? { ...prev, filterText: textAfterTrigger, selectedIndex: 0 } : null);
      }
    } else {
      // detect new trigger
      const charBefore = cursorPos > 0 ? nextValue[cursorPos - 1] : "";
      const charBeforeThat = cursorPos > 1 ? nextValue[cursorPos - 2] : "";
      if ((charBefore === "@" || charBefore === "#") && (charBeforeThat === "" || charBeforeThat === " " || charBeforeThat === "\n" || cursorPos === 1)) {
        setPopup({
          trigger: charBefore as "@" | "#",
          triggerPos: cursorPos - 1,
          filterText: "",
          selectedIndex: 0,
        });
      }
    }
  }

  function insertReference(option: AutocompleteOption) {
    if (!popup || !textareaRef.current) return;
    const before = value.slice(0, popup.triggerPos);
    const after = value.slice(popup.triggerPos + 1 + popup.filterText.length);
    const inserted = option.path;
    const nextValue = before + inserted + " " + after;
    onChange(nextValue);

    // sync outputBinding if it was a # reference
    if (popup.trigger === "#" && onOutputReference) {
      const outputKey = option.path.replace(/^\$output\./, "");
      onOutputReference(outputKey);
    }

    setPopup(null);

    // restore cursor position
    const nextCursor = before.length + inserted.length + 1;
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = nextCursor;
        textareaRef.current.selectionEnd = nextCursor;
        textareaRef.current.focus();
      }
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!popup) return;
    const query = popup.filterText.toLowerCase();
    const filtered = activeOptions.filter(
      (o) => o.label.toLowerCase().includes(query) || o.path.toLowerCase().includes(query),
    );
    if (filtered.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setPopup((prev) => prev ? { ...prev, selectedIndex: (prev.selectedIndex + 1) % filtered.length } : null);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setPopup((prev) =>
        prev ? { ...prev, selectedIndex: (prev.selectedIndex - 1 + filtered.length) % filtered.length } : null,
      );
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const idx = (popup.selectedIndex % filtered.length + filtered.length) % filtered.length;
      insertReference(filtered[idx]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setPopup(null);
    }
  }

  const sharedTextStyle = "text-sm leading-6 font-[inherit]";

  return (
    <div className="relative">
      {/* Overlay: renders colored chips */}
      <div
        ref={overlayRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-3.5 py-3",
          sharedTextStyle,
          className,
        )}
      >
        {renderOverlay()}
      </div>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        className={cn(
          "w-full resize-none rounded-[16px] border border-[var(--line)] bg-[rgba(255,255,255,0.82)] px-3.5 py-3",
          sharedTextStyle,
          "text-transparent caret-[var(--text)] selection:bg-[rgba(154,52,18,0.15)] selection:text-transparent",
          "placeholder:text-[var(--muted)]",
          className,
        )}
      />

      {/* Autocomplete popup — positioned below textarea */}
      {popup ? (
        <div className="absolute left-0 right-0 z-50 mt-1" onMouseDown={(e) => e.preventDefault()}>
          <AutocompletePopup
            options={activeOptions}
            filterText={popup.filterText}
            selectedIndex={popup.selectedIndex}
            onSelect={insertReference}
          />
        </div>
      ) : null}
    </div>
  );
}
