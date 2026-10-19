import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { STAGE_META, STAGE_ORDER, stageHex } from "@/data/stages";
import { weekRange, type Application } from "@/data/mock";
import { mdOf, useApps } from "@/store/applications";
import { exportNodeAsPng } from "@/lib/exportImage";
import { Eye, EyeOff, ImageDown, Presentation, Sparkles } from "lucide-react";

type Template = "table" | "single" | "weekly";

/* ---------- P1 模版：进度总表 ---------- */
const CITY_COLORS = [
  { bg: "#DCE7F7", fg: "#4A6A94" }, // 蓝
  { bg: "#D9EFE9", fg: "#3E7A6D" }, // 青
  { bg: "#FBEBD3", fg: "#9A6B1F" }, // 杏
  { bg: "#E9E2F5", fg: "#6A5896" }, // 紫
  { bg: "#E2EFDA", fg: "#4A7538" }, // 绿
  { bg: "#F8DEE3", fg: "#A34A63" }, // 粉
];

function cityColor(city: string) {
  let h = 0;
  for (const ch of city) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CITY_COLORS[h % CITY_COLORS.length];
}

/* ---------- 迷你流程时间线（投递→笔试→一面→二面→HR→Offer） ---------- */
function MiniStepper({ app }: { app: Application }) {
  const lastRound = app.rounds[app.rounds.length - 1];
  const rejected = app.status === "rejected";
  const reachedIdx = rejected
    ? Math.max(0, STAGE_ORDER.indexOf(lastRound?.stage ?? "applied"))
    : STAGE_ORDER.indexOf(app.stage);
  return (
    <span className="inline-flex items-center" title={STAGE_META[app.stage].label}>
      {STAGE_ORDER.map((s, i) => {
        const skipped = app.skipWritten && s === "written";
        const filled = !skipped && i <= reachedIdx;
        const isEnd = rejected && i === reachedIdx;
        const color = isEnd ? STAGE_META.rejected.hex : STAGE_META[s].hex;
        return (
          <span key={s} className="flex items-center">
            {i > 0 && (
              <span
                className="h-px w-[7px]"
                style={{
                  backgroundColor:
                    !skipped && i <= reachedIdx ? `${STAGE_META[s].hex}88` : "#E8E5DD",
                }}
              />
            )}
            <span
              className="h-[7px] w-[7px] rounded-full"
              style={
                filled
                  ? { backgroundColor: color }
                  : {
                      backgroundColor: "#fff",
                      boxShadow: skipped ? "none" : `inset 0 0 0 1.5px ${skipped ? "#D8D4C8" : "#E8E5DD"}`,
                      border: skipped ? "1px dashed #C9C4B4" : "none",
                    }
              }
            />
          </span>
        );
      })}
    </span>
  );
}

function TableCard({
  apps,
  anonymous,
}: {
  apps: Application[];
  anonymous: boolean;
}) {
  const today = mdOf(new Date());
  const stageRank = (a: Application) =>
    a.stage === "rejected" ? -1 : STAGE_ORDER.indexOf(a.stage);
  // 进度最深的排最前，已挂垫底
  const rows = [...apps].sort((x, y) => stageRank(y) - stageRank(x));
  const visible = rows.slice(0, 22);
  const rest = rows.length - visible.length;
  const activeCount = apps.filter((a) => a.status === "active").length;
  const offerCount = apps.filter((a) => a.status === "offer").length;
  const rejectedCount = apps.filter((a) => a.status === "rejected").length;

  /* 阶段分布 → 环形比例图 */
  const dist = [
    ...STAGE_ORDER.filter((s) => s !== "applied"),
    "rejected" as const,
  ]
    .map((s) => ({ stage: s, count: apps.filter((a) => a.stage === s).length }))
    .filter((d) => d.count > 0);
  const total = apps.length;
  let acc = 0;
  const segs = dist
    .map((d) => {
      const from = (acc / total) * 360;
      acc += d.count;
      const to = (acc / total) * 360;
      return `${STAGE_META[d.stage].hex} ${from.toFixed(1)}deg ${to.toFixed(1)}deg`;
    })
    .join(", ");

  const GRID = "grid-cols-[22px_0.85fr_1fr_42px_104px]";

  return (
    <div
      className="flex h-full w-full flex-col rounded-[28px] bg-white p-6"
      style={{ boxShadow: "0 24px 60px -24px rgb(60 50 30 / 0.25)" }}
    >
      {/* 头部 */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[22px] font-bold leading-tight tracking-tight">
            秋招进度表
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            进行中 {activeCount} · Offer {offerCount} · 已挂 {rejectedCount}
          </p>
        </div>
        <span className="text-[11px] tabular-nums text-ink-faint">
          10.{today.slice(3)}
        </span>
      </div>

      {/* 比例图：阶段分布环 + 图例 */}
      <div className="mt-3 flex items-center gap-4 rounded-xl border border-[#EDEAE2] bg-[#FCFBF8] px-4 py-3">
        <div
          className="relative h-[72px] w-[72px] shrink-0 rounded-full"
          style={{ background: `conic-gradient(${segs})` }}
        >
          <div className="absolute inset-[14px] grid place-items-center rounded-full bg-white">
            <div className="text-center">
              <div className="text-lg font-bold leading-none tabular-nums text-[#2E2E2A]">
                {total}
              </div>
              <div className="mt-0.5 text-[8px] text-ink-faint">家</div>
            </div>
          </div>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-x-2 gap-y-1">
          {dist.map((d) => (
            <div key={d.stage} className="flex min-w-0 items-center gap-1">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: STAGE_META[d.stage].hex }}
              />
              <span className="truncate text-[9px] text-ink-soft">
                {STAGE_META[d.stage].label}
              </span>
              <span className="text-[9px] font-semibold tabular-nums text-ink">
                {d.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 表格：Excel 样式（表头灰底 + 斑马纹 + 行线），每行带迷你时间线 */}
      <div className="mt-3 flex-1 overflow-hidden rounded-xl border border-[#EDEAE2]">
        <div className={`grid ${GRID} items-center bg-[#F5F3EC] px-2 py-1.5 text-[10px] font-semibold text-ink-soft`}>
          <span className="text-center">#</span>
          <span className="px-1">公司</span>
          <span className="px-1">岗位</span>
          <span className="px-1">城市</span>
          <span className="px-1 text-right">进度</span>
        </div>
        <div className="flex-1">
          {visible.map((a, i) => {
            const meta = STAGE_META[a.stage];
            const cc = cityColor(a.city || " ");
            return (
              <div
                key={a.id}
                className={`grid ${GRID} items-center border-b border-[#F1EFE8] px-2 py-[5px] text-[11px] last:border-b-0 ${
                  i % 2 === 1 ? "bg-[#FAF9F5]" : "bg-white"
                }`}
              >
                <span className="text-center text-[9px] tabular-nums text-ink-faint">
                  {i + 1}
                </span>
                <span className="truncate px-1 font-semibold text-[#2E2E2A]">
                  {anonymous ? a.anonymousName : a.company}
                </span>
                <span className="truncate px-1 text-ink-soft">{a.role}</span>
                <span className="px-1">
                  {a.city ? (
                    <span
                      className="inline-block rounded px-1 py-px text-[9px] font-medium"
                      style={{ backgroundColor: cc.bg, color: cc.fg }}
                    >
                      {a.city}
                    </span>
                  ) : (
                    <span className="text-[9px] text-ink-faint">-</span>
                  )}
                </span>
                <span className="flex items-center justify-end gap-1.5 px-1">
                  <MiniStepper app={a} />
                  <span
                    className="inline-block rounded px-1 py-px text-[9px] font-medium"
                    style={{ backgroundColor: `${meta.hex}33`, color: meta.deep }}
                  >
                    {meta.label}
                  </span>
                </span>
              </div>
            );
          })}
          {rest > 0 && (
            <div className="py-1.5 text-center text-[10px] text-ink-faint">
              还有 {rest} 家，App 里看全部
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- 单公司进度卡 ---------- */
function SingleCard({
  app,
  anonymous,
}: {
  app: Application;
  anonymous: boolean;
}) {
  const meta = STAGE_META[app.stage];
  const company = anonymous ? app.anonymousName : app.company;
  const dayCount = 26; // mock：投递第 N 天

  return (
    <div
      className="flex h-full w-full flex-col rounded-[28px] bg-white p-8"
      style={{ boxShadow: "0 24px 60px -24px rgb(60 50 30 / 0.25)" }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-[0.2em] text-ink-faint">
          秋招记录 · WEEK 42
        </span>
        <span className="text-[11px] tabular-nums text-ink-faint">2026.10.13</span>
      </div>

      <div className="mt-6">
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: `${meta.hex}2E`, color: meta.deep }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.hex }} />
          当前：{meta.label}
        </div>
        <h2 className="mt-3 text-[34px] font-bold leading-tight tracking-tight">
          {company}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{app.role}</p>
      </div>

      {/* 时间线 */}
      <div className="mt-7 flex-1">
        {app.rounds.map((r, i) => {
          const m = STAGE_META[r.stage];
          const fail = r.result === "fail";
          return (
            <div key={r.id} className="relative flex gap-4 pb-5 last:pb-0">
              {i < app.rounds.length - 1 && (
                <div
                  className="absolute left-[7px] top-4 h-full w-px"
                  style={{
                    backgroundColor: fail
                      ? `${STAGE_META.rejected.hex}55`
                      : `${m.hex}66`,
                  }}
                />
              )}
              <div
                className="z-10 mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-[3px] border-white"
                style={{
                  backgroundColor: fail ? STAGE_META.rejected.hex : m.hex,
                  boxShadow: `0 0 0 1.5px ${fail ? STAGE_META.rejected.hex : m.hex}`,
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-semibold" style={{ color: fail ? STAGE_META.rejected.deep : "#2E2E2A" }}>
                    {r.title}
                  </span>
                  <span className="text-[11px] tabular-nums text-ink-faint">
                    10.{r.date.slice(3)}
                  </span>
                </div>
                {r.note && (
                  <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-ink-faint">
                    {r.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部 */}
      <div className="mt-auto flex items-center justify-between border-t border-dashed border-border pt-5">
        <span className="text-xs text-ink-faint">
          投递第 <span className="font-semibold text-ink">{dayCount}</span> 天
        </span>
        <span className="flex items-center gap-1 text-xs text-ink-faint">
          <Sparkles className="h-3.5 w-3.5" style={{ color: meta.hex }} />
          记录于秋招工作台
        </span>
      </div>
    </div>
  );
}

/* ---------- 周汇总卡 ---------- */
function WeeklyCard({
  apps,
  anonymous,
}: {
  apps: Application[];
  anonymous: boolean;
}) {
  const actives = apps.filter((a) => a.status === "active");
  const done = apps.filter((a) => a.status !== "active");
  const row = (id: string) => {
    const a = apps.find((x) => x.id === id)!;
    return { ...a, company: anonymous ? a.anonymousName : a.company };
  };

  const stats = [
    { label: "面试", value: 2, hex: STAGE_META.first.hex },
    { label: "笔试", value: 1, hex: STAGE_META.written.hex },
    { label: "新投递", value: 2, hex: STAGE_META.applied.hex },
    { label: "Offer", value: 1, hex: STAGE_META.offer.hex },
  ];

  return (
    <div
      className="flex h-full w-full flex-col rounded-[28px] bg-white p-7"
      style={{ boxShadow: "0 24px 60px -24px rgb(60 50 30 / 0.25)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-[0.2em] text-ink-faint">
          秋招周报
        </span>
        <span className="text-[11px] tabular-nums text-ink-faint">{weekRange}</span>
      </div>

      <h2 className="mt-3 text-[28px] font-bold leading-tight tracking-tight">
        第 42 周 · {apps.length} 家进行中
      </h2>

      {/* 统计行 */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl px-2 py-2 text-center"
            style={{ backgroundColor: `${s.hex}24` }}
          >
            <div className="text-lg font-bold tabular-nums" style={{ color: STAGE_META.applied.deep }}>
              {s.value}
            </div>
            <div className="text-[10px]" style={{ color: "#6B6B66" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* 公司列表 */}
      <div className="mt-3 flex-1 space-y-0.5 overflow-hidden">
        {[...actives.map((a) => a.id), ...done.map((a) => a.id)].map((id) => {
          const a = row(id);
          const meta = STAGE_META[a.stage];
          const last = a.rounds[a.rounds.length - 1];
          return (
            <div key={id} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
              <span
                className="h-7 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: meta.hex }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[14px] font-semibold leading-tight">{a.company}</span>
                  <span className="truncate text-[10px] text-ink-faint">{a.role}</span>
                </div>
                <div className="mt-px text-[10px] text-ink-faint">
                  最新：{last.title} · 10.{last.date.slice(3)}
                </div>
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${meta.hex}2E`, color: meta.deep }}
              >
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-dashed border-border pt-5">
        <span className="text-xs text-ink-faint">拒绝焦虑 · 稳步拿 offer</span>
        <span className="flex items-center gap-1 text-xs text-ink-faint">
          <Sparkles className="h-3.5 w-3.5" style={{ color: stageHex("first") }} />
          记录于秋招工作台
        </span>
      </div>
    </div>
  );
}

/* ---------- 视图 ---------- */
export default function ShareCard() {
  const { apps } = useApps();
  const params = new URLSearchParams(window.location.search);
  const active = apps.filter((a) => a.status === "active");
  const [template, setTemplate] = useState<Template>(
    params.get("tpl") === "single" || params.get("tpl") === "weekly"
      ? (params.get("tpl") as Template)
      : "table"
  );
  const [appId, setAppId] = useState(
    apps.some((a) => a.id === params.get("app")) ? params.get("app")! : (active[0]?.id ?? "")
  );
  const [anonymous, setAnonymous] = useState(params.get("anon") === "1");
  const [exporting, setExporting] = useState(false);
  // 展示模式：隐藏标题栏/控制条，整个窗口只留卡片；zen 状态由 App 全局管理（app-zen 事件）
  const [zen, setZen] = useState(
    new URLSearchParams(window.location.search).get("zen") === "1"
  );
  const setZenMode = (v: boolean) => {
    window.dispatchEvent(new CustomEvent("app-zen", { detail: v }));
  };
  useEffect(() => {
    const on = (e: Event) => setZen(Boolean((e as CustomEvent).detail));
    window.addEventListener("app-zen", on);
    return () => window.removeEventListener("app-zen", on);
  }, []);
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  // 展示模式下自动整体缩放：卡片再长也一屏放下，一张系统截图就是完整的
  const [fit, setFit] = useState({ s: 1, h: 0 });
  useLayoutEffect(() => {
    if (!zen) return;
    const measure = () => {
      const card = cardRef.current;
      const canvas = canvasRef.current;
      if (!card || !canvas) return;
      const h = card.offsetHeight;
      if (h <= 0) return;
      const avail = canvas.clientHeight - 32; // p-4 上下留白
      if (avail <= 0) return; // 窗口尚未布局完成，等下一轮 measure
      const s = Math.min(1, avail / h);
      setFit((prev) => (Math.abs(prev.s - s) < 0.001 && prev.h === h ? prev : { s, h }));
    };
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [zen, template, appId, anonymous, apps]);

  const currentApp = apps.find((a) => a.id === appId) ?? active[0];

  const exportImage = async () => {
    const node = cardRef.current;
    if (!node || exporting) return;
    setExporting(true);
    try {
      const name =
        template === "single" ? (currentApp?.company ?? "进度卡") : template === "table" ? "进度表" : "周报";
      await exportNodeAsPng({ node, filename: `秋招卡片-${name}.png` });
    } catch (err) {
      console.error("导出失败", err);
      alert("导出失败，可直接截图使用");
    } finally {
      setExporting(false);
    }
  };

  const cardContent =
    template === "table" ? (
      apps.length > 0 ? (
        <TableCard apps={apps} anonymous={anonymous} />
      ) : (
        <div className="grid aspect-[3/4] place-items-center rounded-[28px] border border-dashed border-border bg-white text-sm text-ink-faint">
          先记录岗位，再来生成表格
        </div>
      )
    ) : template === "single" ? (
      currentApp ? (
        <SingleCard app={currentApp} anonymous={anonymous} />
      ) : (
        <div className="grid h-full place-items-center rounded-[28px] border border-dashed border-border bg-white text-sm text-ink-faint">
          先记录一次投递，再来生成卡片
        </div>
      )
    ) : (
      <WeeklyCard apps={apps} anonymous={anonymous} />
    );

  return (
    <div className="flex h-full min-h-0 flex-col space-y-5">
      {!zen && (
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">分享卡片</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-1.5 py-1.5">
          {(
            [
              { key: "table", label: "进度总表" },
              { key: "single", label: "单公司进度卡" },
              { key: "weekly", label: "周汇总卡" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTemplate(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                template === t.key ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      )}

      {/* 控制条 */}
      {!zen && (
      <div className="flex items-center gap-3">
        {template === "single" && (
          <div className="flex items-center gap-1.5">
            {active.map((a) => (
              <button
                key={a.id}
                onClick={() => setAppId(a.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  appId === a.id
                    ? "border-ink/30 bg-card text-ink"
                    : "border-border text-ink-faint hover:text-ink-soft"
                }`}
              >
                {a.company}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setAnonymous(!anonymous)}
          className={`ml-auto flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            anonymous
              ? "border-stage-hr/50 bg-stage-hr/15 text-[#6A5896]"
              : "border-border text-ink-soft"
          }`}
        >
          {anonymous ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          匿名模式
        </button>
        <button
          onClick={() => setZenMode(true)}
          title="隐藏所有界面元素，整个窗口只留卡片，方便手工截图"
          className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"
        >
          <Presentation className="h-3.5 w-3.5" />
          展示模式
        </button>
        <button
          onClick={exportImage}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-paper hover:opacity-90 disabled:opacity-50"
        >
          <ImageDown className="h-3.5 w-3.5" />
          {exporting ? "导出中…" : "导出图片"}
        </button>
      </div>
      )}

      {/* 展示模式退出按钮由 App 全局渲染 */}

      {/* 卡片画布：普通模式超高可滚动；展示模式自动整体缩放，一屏放下方便截图 */}
      <div
        ref={canvasRef}
        className={`flex flex-1 ${
          zen
            ? "overflow-hidden bg-paper p-4"
            : "overflow-y-auto rounded-2xl border border-dashed border-border bg-[radial-gradient(circle_at_30%_20%,#F3EFE6,transparent_60%),radial-gradient(circle_at_75%_80%,#EDF0EA,transparent_55%)] bg-paper p-10"
        }`}
      >
        {zen ? (
          <div
            className="m-auto w-full shrink-0"
            style={{
              maxWidth: template === "table" ? 700 : 520,
              // 缩放后按缩放高度占位，保证垂直居中且不产生滚动条
              ...(fit.s < 1 ? { height: Math.ceil(fit.h * fit.s) } : {}),
            }}
          >
            <div
              className={`w-full ${template !== "table" ? "aspect-[3/4]" : ""}`}
              ref={cardRef}
              style={{ transform: `scale(${fit.s})`, transformOrigin: "top center" }}
            >
              {cardContent}
            </div>
          </div>
        ) : (
          <div
            className={`m-auto w-full shrink-0 ${
              template === "table"
                ? "max-w-[560px]"
                : "aspect-[3/4] max-w-[420px]"
            }`}
            ref={cardRef}
          >
            {cardContent}
          </div>
        )}
      </div>
    </div>
  );
}
