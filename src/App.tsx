import { useEffect, useState } from "react";
import { ApplicationsProvider } from "@/store/applications";
import Overview from "@/views/Overview";
import Timeline from "@/views/Timeline";
import Transcripts from "@/views/Transcripts";
import ShareCard from "@/views/ShareCard";
import DayBook from "@/views/DayBook";
import { STAGE_META, type Stage } from "@/data/stages";
import { CalendarDays, LayoutDashboard, Milestone, Mic2, Share2, Sprout, X } from "lucide-react";

type ViewKey = "overview" | "timeline" | "days" | "transcripts" | "share";

const NAV: { key: ViewKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "总览", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "timeline", label: "投递管理", icon: <Milestone className="h-4 w-4" /> },
  { key: "days", label: "每日", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "transcripts", label: "面试转写", icon: <Mic2 className="h-4 w-4" /> },
  { key: "share", label: "分享卡片", icon: <Share2 className="h-4 w-4" /> },
];

const LEGEND: Stage[] = ["applied", "screening", "written", "first", "second", "hr", "offer", "rejected"];

export default function App() {
  const param = new URLSearchParams(window.location.search).get("view");
  const [view, setView] = useState<ViewKey>(
    (["overview", "timeline", "days", "transcripts", "share"].includes(param ?? "")
      ? param
      : "share") as ViewKey
  );

  // 展示模式：隐藏侧边栏，整个窗口只留页面内容（供手工截图展示平台）；?zen=1 直接进入
  const [zen, setZen] = useState(
    new URLSearchParams(window.location.search).get("zen") === "1"
  );
  useEffect(() => {
    const on = (e: Event) => setZen(Boolean((e as CustomEvent).detail));
    window.addEventListener("app-zen", on);
    return () => window.removeEventListener("app-zen", on);
  }, []);
  useEffect(() => {
    if (!zen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.dispatchEvent(new CustomEvent("app-zen", { detail: false }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zen]);

  return (
    <ApplicationsProvider>
      {/* 展示模式退出按钮（全局，任何页面可用） */}
      {zen && (
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("app-zen", { detail: false }))}
          className="fixed right-5 top-5 z-50 flex items-center gap-1.5 rounded-full bg-ink/75 px-4 py-2 text-xs font-medium text-paper backdrop-blur transition-colors hover:bg-ink"
        >
          <X className="h-3.5 w-3.5" />
          退出展示（ESC）
        </button>
      )}
      <div className="flex h-screen overflow-hidden bg-paper text-ink antialiased">
      {/* 侧边栏 */}
      {!zen && (
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-stage-offer/25">
            <Sprout className="h-5 w-5 text-[#4A7538]" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">秋招工作台</div>
            <div className="text-[11px] text-ink-faint">2027 届 · 视觉稿 v0</div>
          </div>
        </div>

        <nav className="space-y-1 px-3">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                view === n.key
                  ? "bg-ink text-paper"
                  : "text-ink-soft hover:bg-secondary hover:text-ink"
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>

        {/* 阶段色图例 */}
        <div className="mt-auto px-5 pb-6">
          <div className="rounded-2xl border border-border bg-paper p-4">
            <div className="text-[11px] font-medium tracking-wide text-ink-faint">
              阶段配色
            </div>
            <div className="mt-2.5 space-y-1.5">
              {LEGEND.map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs text-ink-soft">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: STAGE_META[s].hex }}
                  />
                  {STAGE_META[s].label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
      )}

      {/* 主内容 */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className={`mx-auto max-w-6xl h-full ${zen ? "px-4 py-4" : "px-8 py-8"}`}>
          {view === "overview" && <Overview />}
          {view === "timeline" && <Timeline />}
          {view === "days" && <DayBook />}
          {view === "transcripts" && <Transcripts />}
          {view === "share" && <ShareCard />}
        </div>
      </main>
      </div>
    </ApplicationsProvider>
  );
}
