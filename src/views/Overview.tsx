import { STAGE_META, type Stage } from "@/data/stages";
import type { Application } from "@/data/mock";
import { useApps, upcomingRound } from "@/store/applications";
import { StageChip } from "@/components/StageChip";
import {
  ArrowRight,
  CalendarClock,
  FileText,
  Flame,
  Gift,
  PieChart,
  Presentation,
  Target,
} from "lucide-react";

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_3px_rgb(0_0_0/0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-soft">{label}</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accent}26`, color: accent }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function Funnel({ apps }: { apps: Application[] }) {
  const has = (stages: string[]) =>
    apps.filter((a) => a.rounds.some((r) => stages.includes(r.stage))).length;
  const steps = [
    { label: "投递", value: apps.length, stage: "applied" as const },
    { label: "笔试", value: has(["written", "first", "second", "hr", "offer"]), stage: "written" as const },
    { label: "面试", value: has(["first", "second", "hr", "offer"]), stage: "first" as const },
    { label: "HR面", value: has(["hr", "offer"]), stage: "hr" as const },
    { label: "Offer", value: apps.filter((a) => a.status === "offer").length, stage: "offer" as const },
  ];
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_3px_rgb(0_0_0/0.04)]">
      <h3 className="text-sm font-medium text-ink-soft">转化漏斗</h3>
      <div className="mt-5 space-y-4">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-10 text-right text-xs text-ink-faint">{s.label}</span>
            <div className="h-5 flex-1 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(s.value / max) * 100}%`,
                  backgroundColor: STAGE_META[s.stage].hex,
                }}
              />
            </div>
            <span className="w-6 text-sm font-medium tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Upcoming({ apps }: { apps: Application[] }) {
  const items = apps
    .filter((a) => a.status === "active" && upcomingRound(a))
    .map((a) => ({ app: a, round: upcomingRound(a)! }))
    .sort((x, y) => x.round.date.localeCompare(y.round.date));
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_3px_rgb(0_0_0/0.04)]">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-ink-faint" />
        <h3 className="text-sm font-medium text-ink-soft">接下来的安排</h3>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-faint">
            暂无安排，去投递管理里「记一轮」添加吧
          </p>
        )}
        {items.map(({ app, round }) => (
          <div
            key={app.id}
            className="flex items-center gap-4 rounded-xl border border-border bg-paper px-4 py-3"
          >
            <div className="text-center leading-tight">
              <div className="text-base font-semibold tabular-nums">{round.date.slice(3)}</div>
              <div className="text-[11px] text-ink-faint">{round.date.slice(0, 2)}月</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {app.company} · {round.title}
              </div>
              <div className="text-xs text-ink-faint">{round.time ?? "时间待定"}</div>
            </div>
            <StageChip stage={round.stage} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity({ apps }: { apps: Application[] }) {
  const rows = apps
    .map((a) => {
      const last = a.rounds[a.rounds.length - 1];
      return { app: a, text: last.title, date: last.date, stage: last.stage };
    })
    .sort((x, y) => y.date.localeCompare(x.date));
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_3px_rgb(0_0_0/0.04)]">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-ink-faint" />
        <h3 className="text-sm font-medium text-ink-soft">最近动态</h3>
      </div>
      <div className="mt-4 divide-y divide-border/70">
        {rows.slice(0, 6).map((r, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="text-xs text-ink-faint tabular-nums w-10">
              {r.date.startsWith("20") ? r.date.slice(5) : r.date}
            </span>
            <span className="font-medium">{r.app.company}</span>
            <span className="text-ink-soft truncate flex-1">{r.text}</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-faint" />
            <StageChip stage={r.stage} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 面试统计：总数 + 一面/二面/HR 面占比 + 通过情况 ---------- */
function InterviewStats({ apps }: { apps: Application[] }) {
  const rounds = apps.flatMap((a) => a.rounds);
  const ivStages: Stage[] = ["first", "second", "hr"];
  const iv = rounds.filter((r) => ivStages.includes(r.stage));
  const total = iv.length;
  const written = rounds.filter((r) => r.stage === "written").length;
  const pass = iv.filter((r) => r.result === "pass").length;
  const fail = iv.filter((r) => r.result === "fail").length;
  const pending = total - pass - fail;

  const per = ivStages.map((s) => ({
    stage: s,
    count: iv.filter((r) => r.stage === s).length,
  }));
  let acc = 0;
  const segs = per
    .filter((d) => d.count > 0)
    .map((d) => {
      const from = total ? (acc / total) * 360 : 0;
      acc += d.count;
      const to = total ? (acc / total) * 360 : 0;
      return `${STAGE_META[d.stage].hex} ${from.toFixed(1)}deg ${to.toFixed(1)}deg`;
    })
    .join(", ");

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_3px_rgb(0_0_0/0.04)]">
      <div className="flex items-center gap-2">
        <PieChart className="h-4 w-4 text-ink-faint" />
        <h3 className="text-sm font-medium text-ink-soft">面试统计</h3>
      </div>
      <p className="mt-1 text-xs text-ink-faint">
        笔试 {written} 场 · 面试 {total} 场
      </p>

      {total === 0 ? (
        <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-border py-10 text-sm text-ink-faint">
          还没有面试记录
        </div>
      ) : (
        <>
          {/* 环形占比图 + 图例 */}
          <div className="mt-4 flex items-center gap-5">
            <div
              className="relative h-[88px] w-[88px] shrink-0 rounded-full"
              style={{ background: segs ? `conic-gradient(${segs})` : "#EDEAE2" }}
            >
              <div className="absolute inset-[16px] grid place-items-center rounded-full bg-card">
                <div className="text-center">
                  <div className="text-xl font-bold leading-none tabular-nums">{total}</div>
                  <div className="mt-1 text-[10px] text-ink-faint">场面试</div>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {per.map((d) => (
                <div key={d.stage} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STAGE_META[d.stage].hex }}
                  />
                  <span className="w-12 text-sm text-ink-soft">
                    {STAGE_META[d.stage].label}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${total ? (d.count / total) * 100 : 0}%`,
                        backgroundColor: STAGE_META[d.stage].hex,
                      }}
                    />
                  </div>
                  <span className="w-14 text-right text-sm tabular-nums">
                    {d.count} 场 · {total ? Math.round((d.count / total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 结果概况 */}
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="rounded-full bg-stage-offer/15 px-2.5 py-1 font-medium text-[#4A7538]">
              通过 {pass}
            </span>
            <span className="rounded-full bg-stage-rejected/10 px-2.5 py-1 font-medium text-[#9C4A4A]">
              未通过 {fail}
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-ink-soft">
              待结果 {pending}
            </span>
            <span className="ml-auto text-ink-faint">
              通过率{" "}
              {pass + fail > 0 ? Math.round((pass / (pass + fail)) * 100) : 0}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function Overview() {
  const { apps } = useApps();
  const interviewing = apps.filter(
    (a) => ["first", "second", "hr"].includes(a.stage) && a.status === "active"
  ).length;
  const offers = apps.filter((a) => a.status === "offer").length;
  const todo = apps.filter(
    (a) => a.status === "active" && upcomingRound(a)
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">总览</h1>
          <p className="mt-1 text-sm text-ink-faint">
            2027 届秋招 · 第 42 周（10.09 – 10.15）
          </p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("app-zen", { detail: true }))}
          title="隐藏侧边栏，全宽展示页面，方便手工截图"
          className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"
        >
          <Presentation className="h-3.5 w-3.5" />
          展示模式
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={<FileText className="h-4 w-4" />} label="已投递" value={apps.length} accent={STAGE_META.applied.deep} />
        <StatCard icon={<Target className="h-4 w-4" />} label="面试流程中" value={interviewing} accent={STAGE_META.first.deep} />
        <StatCard icon={<Flame className="h-4 w-4" />} label="即将面试" value={todo} accent={STAGE_META.second.deep} />
        <StatCard icon={<Gift className="h-4 w-4" />} label="Offer" value={offers} accent={STAGE_META.offer.deep} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Funnel apps={apps} />
        <Upcoming apps={apps} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InterviewStats apps={apps} />
        <RecentActivity apps={apps} />
      </div>
    </div>
  );
}
