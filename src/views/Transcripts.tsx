import { useMemo, useState } from "react";
import { STAGE_META } from "@/data/stages";
import type { Round } from "@/data/mock";
import { useApps } from "@/store/applications";
import { StageChip } from "@/components/StageChip";
import { Mic2, Search, Sparkles, Star, StickyNote } from "lucide-react";

interface Entry {
  appId: string;
  company: string;
  role: string;
  round: Round;
}

function Rating({ value }: { value?: number }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-ink-faint">
      自评
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-3 w-3"
          fill={i < value ? "#F2C57C" : "none"}
          stroke={i < value ? "#F2C57C" : "currentColor"}
        />
      ))}
    </span>
  );
}

function Reader({ entry, query }: { entry: Entry; query: string }) {
  const { round } = entry;
  const meta = STAGE_META[round.stage];
  const lines = round.transcript ?? [];

  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const idx = text.indexOf(query.trim());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded-sm bg-stage-first/40 px-0.5 text-inherit">
          {text.slice(idx, idx + query.trim().length)}
        </mark>
        {text.slice(idx + query.trim().length)}
      </>
    );
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col self-start rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgb(0_0_0/0.04)]">
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold tracking-tight">
                {entry.company} · {round.title}
              </h2>
              <StageChip stage={round.stage} />
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-ink-faint">
              <span className="tabular-nums">
                2026-10-{round.date.slice(3)}
                {round.time ? ` · ${round.time}` : ""}
              </span>
              {round.interviewer && <span>{round.interviewer}</span>}
              {round.duration && <span>约 {round.duration}</span>}
              {round.hasAudio && (
                <span className="inline-flex items-center gap-1">
                  <Mic2 className="h-3 w-3" /> 已存录音
                </span>
              )}
            </div>
          </div>
          <Rating value={round.rating} />
        </div>
      </div>

      <div
        className="space-y-4 overflow-y-auto px-6 py-6"
        style={{ maxHeight: "calc(100vh - 330px)" }}
      >
        {lines.map((l, i) => (
          <div key={i} className="flex gap-3">
            <div
              className="mt-1 h-7 w-7 shrink-0 rounded-full text-[11px] font-medium flex items-center justify-center"
              style={{
                backgroundColor:
                  l.speaker === "我" ? `${meta.hex}40` : "#EFEEE9",
                color: l.speaker === "我" ? meta.deep : "#6B6B66",
              }}
            >
              {l.speaker === "我" ? "我" : "面"}
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium" style={{ color: l.speaker === "我" ? meta.deep : "#6B6B66" }}>
                  {l.speaker === "我" ? "我" : "面试官"}
                </span>
                {l.time && (
                  <span className="text-[11px] text-ink-faint tabular-nums">{l.time}</span>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink">{highlight(l.text)}</p>
            </div>
          </div>
        ))}
      </div>

      {round.review && (
        <div className="mx-6 mb-4 rounded-xl border border-stage-hr/30 bg-stage-hr/10 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#6A5896]">
            <Sparkles className="h-3.5 w-3.5" /> AI 复盘
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {round.review}
          </p>
        </div>
      )}

      {round.note && (
        <div className="mx-6 mb-6 rounded-xl border border-stage-first/30 bg-stage-first/10 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#9A6B1F]">
            <StickyNote className="h-3.5 w-3.5" /> 复盘笔记
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{round.note}</p>
        </div>
      )}
    </div>
  );
}

export default function Transcripts() {
  const { apps } = useApps();
  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    apps.forEach((a) =>
      a.rounds
        .filter((r) => r.hasAudio || r.transcript)
        .forEach((r) =>
          out.push({ appId: a.id, company: a.company, role: a.role, round: r })
        )
    );
    return out.sort((x, y) => y.round.date.localeCompare(x.round.date));
  }, [apps]);

  const [selected, setSelected] = useState(0);
  const [query, setQuery] = useState("");

  return (
    <div className="flex h-full min-h-0 flex-col space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">面试转写</h1>
          <p className="mt-1 text-sm text-ink-faint">
            {entries.length} 份录音转写稿 · 原文件存于本地 recordings/ 目录
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文稿内容，如『漏斗』"
            className="w-64 rounded-full border border-input bg-card py-2 pl-9 pr-4 text-sm outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ink/10"
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* 左：文稿列表 */}
        <div className="w-72 shrink-0 space-y-2 overflow-y-auto pr-1">
          {entries.map((e, i) => {
            const active = i === selected;
            const meta = STAGE_META[e.round.stage];
            return (
              <button
                key={e.round.id}
                onClick={() => setSelected(i)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-ink/20 bg-card shadow-[0_1px_3px_rgb(0_0_0/0.05)]"
                    : "border-transparent hover:bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{e.company}</span>
                  <span className="text-[11px] text-ink-faint tabular-nums shrink-0">
                    10-{e.round.date.slice(3)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-ink-soft">{e.round.title}</span>
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.hex }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* 右：阅读器 */}
        {entries.length > 0 && (
          <Reader entry={entries[Math.min(selected, entries.length - 1)]} query={query} />
        )}
      </div>
    </div>
  );
}
