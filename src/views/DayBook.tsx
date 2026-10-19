import { useMemo } from "react";
import type { Stage } from "@/data/stages";
import type { Application } from "@/data/mock";
import { StageChip } from "@/components/StageChip";
import { mdOf, useApps, ACTION_STAGES } from "@/store/applications";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Presentation,
} from "lucide-react";

type Ev = {
  date: string; // mm-dd
  time?: string;
  company: string;
  title: string;
  stage: Stage;
  result?: "pass" | "fail" | "pending";
  sourced?: boolean; // 被捞起的岗位：新增事件（没有投递节点）
};

const normDate = (d: string) => (d.startsWith("20") ? d.slice(5) : d);
const WEEK = "日一二三四五六";

function collectEvents(apps: Application[]): Ev[] {
  return apps.flatMap((a) => [
    ...(a.source === "sourced"
      ? [
          {
            date: normDate(a.appliedAt),
            company: a.company,
            title: "被捞起",
            stage: "applied" as Stage,
            sourced: true,
          },
        ]
      : []),
    ...a.rounds.map((r) => ({
      date: normDate(r.date),
      time: r.time,
      company: a.company,
      title: r.title,
      stage: r.stage,
      result: r.result ?? ("pending" as const),
    })),
  ]);
}

function weekdayOf(mmdd: string): string {
  const [m, d] = mmdd.split("-").map(Number);
  return WEEK[new Date(new Date().getFullYear(), m - 1, d).getDay()];
}

const dayLabel = (mmdd: string) =>
  `${Number(mmdd.slice(0, 2))}月${Number(mmdd.slice(3))}日 · 周${weekdayOf(mmdd)}`;

function ResultBadge({ ev }: { ev: Ev }) {
  if (!ev.result) return null; // 「被捞起」等新增事件不打结果标
  if (ev.result === "pass")
    return (
      <span className="rounded-full bg-stage-offer/15 px-2 py-0.5 text-[11px] font-medium text-[#4A7538]">
        通过
      </span>
    );
  if (ev.result === "fail")
    return (
      <span className="rounded-full bg-stage-rejected/10 px-2 py-0.5 text-[11px] font-medium text-[#9C4A4A]">
        未通过
      </span>
    );
  // 只有笔试/面试等要赴约的环节，未出结果才算「待办」
  if (ACTION_STAGES.includes(ev.stage))
    return (
      <span className="rounded-full bg-stage-second/15 px-2 py-0.5 text-[11px] font-medium text-[#8A6A1F]">
        待办
      </span>
    );
  return null;
}

function DayGroup({
  date,
  events,
  highlight,
}: {
  date: string;
  events: Ev[];
  highlight?: "today" | "future";
}) {
  const sorted = [...events].sort((x, y) => (x.time ?? "99").localeCompare(y.time ?? "99"));
  const todos = sorted.filter(
    (e) => e.result === "pending" && ACTION_STAGES.includes(e.stage)
  ).length;
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_3px_rgb(0_0_0/0.04)]">
      <div className="flex items-center gap-2">
        <h3
          className={`text-sm font-semibold ${
            highlight === "today" ? "text-ink" : "text-ink-soft"
          }`}
        >
          {highlight === "today" ? "今天 · " : ""}
          {dayLabel(date)}
        </h3>
        {highlight === "today" && (
          <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-paper">
            今天
          </span>
        )}
        <span className="ml-auto text-xs tabular-nums text-ink-faint">
          {sorted.length} 件事{ todos > 0 && highlight === "today" ? ` · ${todos} 件待办` : ""}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        {sorted.map((ev, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-border/70 bg-paper px-3.5 py-2.5"
          >
            <span className="w-14 shrink-0 text-sm font-semibold tabular-nums">
              {ev.time ? ev.time.split("-")[0] : "—"}
            </span>
            <span className="h-4 w-px bg-border" />
            {ev.sourced ? (
              <span className="shrink-0 rounded-full bg-stage-screening/20 px-2 py-0.5 text-[11px] font-medium text-[#7D7565]">
                新增 · 被捞起
              </span>
            ) : (
              <StageChip stage={ev.stage} />
            )}
            <span className="min-w-0 flex-1 truncate text-sm">
              <span className="font-medium">{ev.company}</span>
              <span className="text-ink-soft"> · {ev.title}</span>
            </span>
            <ResultBadge ev={ev} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DayBook() {
  const { apps } = useApps();
  const today = mdOf(new Date());

  const { todayEvents, futureGroups, pastGroups } = useMemo(() => {
    const events = collectEvents(apps);
    const byDate = new Map<string, Ev[]>();
    for (const e of events) {
      const list = byDate.get(e.date) ?? [];
      list.push(e);
      byDate.set(e.date, list);
    }
    const dates = [...byDate.keys()];
    return {
      todayEvents: byDate.get(today) ?? [],
      futureGroups: dates
        .filter((d) => d > today)
        .sort()
        .map((d) => ({ date: d, events: byDate.get(d)! })),
      pastGroups: dates
        .filter((d) => d < today)
        .sort()
        .reverse()
        .map((d) => ({ date: d, events: byDate.get(d)! })),
    };
  }, [apps, today]);

  const byTime = (x: Ev, y: Ev) => (x.time ?? "99").localeCompare(y.time ?? "99");
  const isTodo = (e: Ev) => e.result === "pending" && ACTION_STAGES.includes(e.stage);
  const todayTodos = todayEvents.filter(isTodo).sort(byTime);
  const todayDone = todayEvents.filter((e) => !isTodo(e)).sort(byTime);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">每日</h1>
          <p className="mt-1 text-sm text-ink-faint">
            每天新增的投递和轮次记录，以及今天待办的笔试面试
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

      {/* 今天：待办优先 */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_3px_rgb(0_0_0/0.04)]">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-ink-faint" />
          <h3 className="text-sm font-semibold">今天 · {dayLabel(today)}</h3>
          <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-paper">
            今天
          </span>
          <span className="ml-auto text-xs tabular-nums text-ink-faint">
            {todayEvents.length} 件事
          </span>
        </div>

        {todayEvents.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">
            今天还没有记录，也没有待办的笔试面试
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {todayTodos.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#8A6A1F]">
                  <Circle className="h-3 w-3" /> 今日待办（{todayTodos.length}）
                </div>
                <div className="space-y-1.5">
                  {todayTodos.map((ev, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-stage-second/30 bg-stage-second/10 px-3.5 py-2.5"
                    >
                      <span className="w-14 shrink-0 text-sm font-semibold tabular-nums">
                        {ev.time ? ev.time.split("-")[0] : "待定"}
                      </span>
                      <span className="h-4 w-px bg-border" />
                      {ev.sourced ? (
                        <span className="shrink-0 rounded-full bg-stage-screening/20 px-2 py-0.5 text-[11px] font-medium text-[#7D7565]">
                          新增 · 被捞起
                        </span>
                      ) : (
                        <StageChip stage={ev.stage} />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-medium">{ev.company}</span>
                        <span className="text-ink-soft"> · {ev.title}</span>
                      </span>
                      <ResultBadge ev={ev} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {todayDone.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                  <CheckCircle2 className="h-3 w-3" /> 今天已记录（{todayDone.length}）
                </div>
                <div className="space-y-1.5">
                  {todayDone.map((ev, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-paper px-3.5 py-2.5"
                    >
                      <span className="w-14 shrink-0 text-sm font-semibold tabular-nums">
                        {ev.time ? ev.time.split("-")[0] : "—"}
                      </span>
                      <span className="h-4 w-px bg-border" />
                      {ev.sourced ? (
                        <span className="shrink-0 rounded-full bg-stage-screening/20 px-2 py-0.5 text-[11px] font-medium text-[#7D7565]">
                          新增 · 被捞起
                        </span>
                      ) : (
                        <StageChip stage={ev.stage} />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-medium">{ev.company}</span>
                        <span className="text-ink-soft"> · {ev.title}</span>
                      </span>
                      <ResultBadge ev={ev} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 明天及以后： upcoming 安排 */}
      {futureGroups.length > 0 && (
        <div className="space-y-4">
          {futureGroups.map((g) => (
            <DayGroup key={g.date} date={g.date} events={g.events} highlight="future" />
          ))}
        </div>
      )}

      {/* 之前：每天做了什么 */}
      {pastGroups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-ink-faint">之前的日子</h3>
          {pastGroups.map((g) => (
            <DayGroup key={g.date} date={g.date} events={g.events} />
          ))}
        </div>
      )}
    </div>
  );
}
