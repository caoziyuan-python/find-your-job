import { useEffect, useRef, useState } from "react";
import { STAGE_META, STAGE_ORDER, type Stage } from "@/data/stages";
import type { Application, Round } from "@/data/mock";
import { StageChip } from "@/components/StageChip";
import { parseTranscript } from "@/lib/transcript";
import { exportNodeAsPng } from "@/lib/exportImage";
import {
  dateInputValue,
  mdOf,
  mdOfInput,
  nextStageOf,
  upcomingRound,
  useApps,
} from "@/store/applications";
import {
  Check,
  Clock3,
  Download,
  ImageDown,
  MapPin,
  Mic2,
  Pencil,
  Plus,
  Presentation,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const RESULT_OPTIONS = [
  { key: "pending", label: "未出结果" },
  { key: "pass", label: "通过" },
  { key: "fail", label: "挂了" },
] as const;

/* ---------- 通用：点击外部 / ESC 关闭 ---------- */
function useOutsideClose(onClose: () => void, active = true) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, active]);
  return ref;
}

/* ---------- 阶段快捷选择 ---------- */
function StagePicker({
  value,
  onChange,
}: {
  value: Stage;
  onChange: (s: Stage) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {[...STAGE_ORDER, "rejected" as Stage].map((s) => {
        const meta = STAGE_META[s];
        const active = s === value;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="rounded-full px-2.5 py-1 text-xs font-medium transition-all"
            style={
              active
                ? {
                    backgroundColor: meta.hex,
                    color: "#fff",
                    boxShadow: `0 2px 8px ${meta.hex}88`,
                  }
                : { backgroundColor: `${meta.hex}22`, color: meta.deep }
            }
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- 来源选择：主动投递 / 被捞 ---------- */
function SourceToggle({
  value,
  onChange,
}: {
  value: "applied" | "sourced";
  onChange: (s: "applied" | "sourced") => void;
}) {
  const options = [
    { key: "applied", label: "我投递的" },
    { key: "sourced", label: "被捞起来的" },
  ] as const;
  return (
    <div className="flex gap-1 rounded-full bg-secondary p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
            value === o.key ? "bg-card shadow-sm text-ink" : "text-ink-faint hover:text-ink-soft"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- 极速「记一轮」 ---------- */
function QuickAddRound({
  app,
  open,
  onToggle,
  onClose,
}: {
  app: Application;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { addRound, updateApplication } = useApps();
  const [stage, setStage] = useState<Stage>(nextStageOf(app.stage, app.skipWritten));
  const [date, setDate] = useState(dateInputValue(new Date()));
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [skipWritten, setSkipWritten] = useState(app.skipWritten ?? false);
  const ref = useOutsideClose(onClose, open);

  useEffect(() => {
    if (open) {
      setStage(nextStageOf(app.stage, app.skipWritten));
      setDate(dateInputValue(new Date()));
      setTime("");
      setNote("");
      setSkipWritten(app.skipWritten ?? false);
    }
  }, [open, app.stage, app.skipWritten]);

  const toggleSkipWritten = (v: boolean) => {
    setSkipWritten(v);
    updateApplication(app.id, { skipWritten: v });
    // 勾上的瞬间如果还停在「笔试」，顺手推到下一轮面试
    if (v && stage === "written") setStage("first");
  };

  const save = () => {
    addRound(app.id, {
      id: `r-${crypto.randomUUID().slice(0, 8)}`,
      stage,
      title: STAGE_META[stage].label,
      date: mdOfInput(date),
      time: time || undefined,
      result: "pending",
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        data-export-hide
        className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:opacity-90 transition-opacity"
      >
        <Plus className="h-3.5 w-3.5" /> 记一轮
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[300px] rounded-2xl border border-border bg-card p-4 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.18)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">记一轮 · {app.company}</span>
            <button onClick={onClose} className="text-ink-faint hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3">
            <StagePicker value={stage} onChange={setStage} />
          </div>
          <label className="mt-2 flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-ink-faint">
            <input
              type="checkbox"
              checked={skipWritten}
              onChange={(e) => toggleSkipWritten(e.target.checked)}
              className="h-3 w-3 accent-ink"
            />
            这家没有笔试，以后直接建议面试
          </label>
          <div className="mt-3 flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 rounded-lg border border-input bg-paper px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ink/10"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-[92px] rounded-lg border border-input bg-paper px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="一句话备注（可选）"
            className="mt-2 w-full rounded-lg border border-input bg-paper px-2.5 py-1.5 text-xs outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ink/10"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-full px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
            >
              取消
            </button>
            <button
              onClick={save}
              className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-paper hover:opacity-90"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 编辑已有轮次（含粘贴文稿） ---------- */
function RoundEditor({
  app,
  round,
  onClose,
}: {
  app: Application;
  round: Round;
  onClose: () => void;
}) {
  const { updateRound, removeRound } = useApps();
  const [stage, setStage] = useState(round.stage);
  const [date, setDate] = useState(
    `${new Date().getFullYear()}-${round.date}`
  );
  const [time, setTime] = useState(round.time ?? "");
  const [note, setNote] = useState(round.note ?? "");
  const [result, setResult] = useState<NonNullable<Round["result"]>>(
    round.result ?? "pending"
  );
  const [pasted, setPasted] = useState("");
  const [review, setReview] = useState(round.review ?? "");
  const ref = useOutsideClose(onClose);

  const save = () => {
    const patch: Partial<Round> = {
      stage,
      title: STAGE_META[stage].label,
      date: mdOfInput(date),
      time: time || undefined,
      note: note.trim() || undefined,
      result,
      review: review.trim() || undefined,
    };
    const lines = pasted.trim() ? parseTranscript(pasted) : [];
    if (lines.length > 0) patch.transcript = lines;
    updateRound(app.id, round.id, patch);
    onClose();
  };

  const remove = () => {
    removeRound(app.id, round.id);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="mt-3 rounded-2xl border border-border bg-paper p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          编辑 · {STAGE_META[round.stage].label}
        </span>
        <button onClick={onClose} className="text-ink-faint hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3">
        <StagePicker value={stage} onChange={setStage} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 rounded-lg border border-input bg-paper px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ink/10"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-[92px] rounded-lg border border-input bg-paper px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ink/10"
        />
      </div>

      {/* 结果 */}
      <div className="mt-3 flex gap-1 rounded-full bg-secondary p-1">
        {RESULT_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => setResult(o.key)}
            className={`flex-1 rounded-full py-1 text-xs font-medium transition-colors ${
              result === o.key ? "bg-card shadow-sm text-ink" : "text-ink-faint"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="一句话备注（可选）"
        className="mt-2 w-full rounded-lg border border-input bg-paper px-2.5 py-1.5 text-xs outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ink/10"
      />

      {/* 粘贴文稿 */}
      <div className="mt-3 rounded-xl border border-dashed border-border bg-paper p-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] font-medium text-ink-soft">
            <Mic2 className="h-3 w-3" />
            {round.transcript?.length
              ? `已存文稿 ${round.transcript.length} 行，粘贴可覆盖`
              : "粘贴整理好的文稿"}
          </span>
        </div>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={3}
          placeholder={"面试官：先介绍一下自己\n我：好的，我……"}
          className="mt-1.5 w-full resize-none rounded-lg border border-input bg-card px-2 py-1.5 text-[11px] leading-relaxed outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ink/10"
        />
      </div>

      {/* AI 复盘 */}
      <div className="mt-2 rounded-xl border border-dashed border-stage-hr/40 bg-stage-hr/10 p-2.5">
        <span className="flex items-center gap-1 text-[11px] font-medium text-[#6A5896]">
          <Sparkles className="h-3 w-3" />
          {round.review ? "已存复盘，粘贴可覆盖" : "粘贴大模型做的复盘"}
        </span>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={3}
          placeholder={"整体表现：……\n答得好：……\n要改进：……"}
          className="mt-1.5 w-full resize-none rounded-lg border border-input bg-card px-2 py-1.5 text-[11px] leading-relaxed outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ink/10"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={remove}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-[#9C4A4A] hover:bg-stage-rejected/10"
        >
          <Trash2 className="h-3.5 w-3.5" /> 删除本轮
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
          >
            取消
          </button>
          <button
            onClick={save}
            className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-paper hover:opacity-90"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 编辑公司信息 ---------- */
function EditApplicationModal({
  app,
  onClose,
}: {
  app: Application;
  onClose: () => void;
}) {
  const { updateApplication } = useApps();
  const [company, setCompany] = useState(app.company);
  const [role, setRole] = useState(app.role);
  const [city, setCity] = useState(app.city);
  const [source, setSource] = useState<"applied" | "sourced">(app.source ?? "applied");
  const [contactDate, setContactDate] = useState(
    app.appliedAt.startsWith("20")
      ? app.appliedAt
      : `${new Date().getFullYear()}-${app.appliedAt}`
  );
  const ref = useOutsideClose(onClose);

  const save = () => {
    if (!company.trim() || !role.trim()) return;
    updateApplication(app.id, {
      company: company.trim(),
      role: role.trim(),
      city: city.trim(),
      source,
      appliedAt: mdOfInput(contactDate),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/20 backdrop-blur-[2px]">
      <div
        ref={ref}
        className="w-[340px] rounded-2xl border border-border bg-card p-5 shadow-[0_24px_60px_-16px_rgb(0_0_0/0.25)]"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">编辑投递 · {app.company}</span>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-2.5">
          <SourceToggle value={source} onChange={setSource} />
          <input
            autoFocus
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="公司 *"
            className="w-full rounded-lg border border-input bg-paper px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ink/10"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="岗位 *"
            className="w-full rounded-lg border border-input bg-paper px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ink/10"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="城市（可选）"
            className="w-full rounded-lg border border-input bg-paper px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ink/10"
          />
          {(source === "sourced" || app.rounds.length === 0) && (
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              {source === "sourced" ? "捞起日期" : "投递日期"}
              <input
                type="date"
                value={contactDate}
                onChange={(e) => setContactDate(e.target.value)}
                className="flex-1 rounded-lg border border-input bg-paper px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ink/10"
              />
            </label>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-xs text-ink-soft hover:text-ink"
          >
            取消
          </button>
          <button
            onClick={save}
            disabled={!company.trim() || !role.trim()}
            className="rounded-full bg-ink px-5 py-2 text-xs font-medium text-paper hover:opacity-90 disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 快速「记录一次投递」 ---------- */
function QuickAddApplication({ onClose }: { onClose: () => void }) {
  const { addApplication } = useApps();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState<"applied" | "sourced">("applied");
  const ref = useOutsideClose(onClose);

  const save = () => {
    if (!company.trim() || !role.trim()) return;
    addApplication({
      company: company.trim(),
      role: role.trim(),
      city: city.trim(),
      source,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/20 backdrop-blur-[2px]">
      <div
        ref={ref}
        className="w-[340px] rounded-2xl border border-border bg-card p-5 shadow-[0_24px_60px_-16px_rgb(0_0_0/0.25)]"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">记录一个岗位</span>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-2.5">
          <SourceToggle value={source} onChange={setSource} />
          <input
            autoFocus
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="公司 *"
            className="w-full rounded-lg border border-input bg-paper px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ink/10"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="岗位 *"
            className="w-full rounded-lg border border-input bg-paper px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ink/10"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="城市（可选）"
            className="w-full rounded-lg border border-input bg-paper px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ink/10"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-xs text-ink-soft hover:text-ink"
          >
            取消
          </button>
          <button
            onClick={save}
            disabled={!company.trim() || !role.trim()}
            className="rounded-full bg-ink px-5 py-2 text-xs font-medium text-paper hover:opacity-90 disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 两步确认按钮 ---------- */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className,
}: {
  label: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 2500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={className}
    >
      {armed ? (
        <span className="inline-flex items-center gap-1">
          <Check className="h-3.5 w-3.5" />
          {confirmLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
}

/* ---------- 流程时间线 ---------- */
function RoundStepper({ app }: { app: Application }) {
  // "add" = 记一轮弹层；roundId = 内联编辑某轮；null = 全关。保证任意时刻只有一个面板
  const [panel, setPanel] = useState<string | null>(null);
  const editingRound = panel && panel !== "add" ? app.rounds.find((r) => r.id === panel) : undefined;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium tracking-wide text-ink-faint">流程时间线</h4>
        <QuickAddRound
          app={app}
          open={panel === "add"}
          onToggle={() => setPanel(panel === "add" ? null : "add")}
          onClose={() => setPanel(null)}
        />
      </div>

      <div className="mt-3">
        <div className="flex items-stretch gap-0">
          {app.rounds.map((r, i) => {
            const meta = STAGE_META[r.stage];
            const isLast = i === app.rounds.length - 1;
            const editing = panel === r.id;
            return (
              <div key={r.id} className="flex flex-1 flex-col">
                <div className="flex items-center">
                  <div
                    className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-card"
                    style={{ borderColor: meta.hex }}
                    title={`${meta.label} · ${r.date}`}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          r.result === "fail" ? STAGE_META.rejected.hex : meta.hex,
                      }}
                    />
                  </div>
                  {!isLast && (
                    <div
                      className="h-0.5 flex-1 -ml-0.5"
                      style={{
                        backgroundColor: `${STAGE_META[app.rounds[i + 1].stage].hex}66`,
                      }}
                    />
                  )}
                </div>
                <button
                  onClick={() => setPanel(editing ? null : r.id)}
                  className={`mt-2 mr-1 rounded-lg px-1.5 py-1 text-left transition-colors ${
                    editing ? "bg-secondary" : "hover:bg-secondary/60"
                  }`}
                >
                  <div className="truncate text-xs font-medium">{r.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-faint tabular-nums">
                    {r.date.startsWith("20") ? r.date.slice(5) : r.date}
                    {r.hasAudio && <Mic2 className="h-3 w-3" />}
                    {r.transcript && r.transcript.length > 0 && (
                      <span className="text-[9px] px-1 rounded bg-stage-written/25 text-[#3E7A6D]">
                        文稿
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {editingRound && (
          <RoundEditor app={app} round={editingRound} onClose={() => setPanel(null)} />
        )}
      </div>
    </div>
  );
}

function ApplicationCard({ app }: { app: Application }) {
  const { removeApplication } = useApps();
  const [editing, setEditing] = useState(false);
  const meta = STAGE_META[app.stage];
  const upcoming = upcomingRound(app);
  // 头部日期跟随时间线第一个节点（投递/被捞后的首个事件），改了节点日期这里自动同步
  const firstRound = app.rounds[0];
  const headDate =
    app.source === "sourced" || !firstRound ? app.appliedAt : firstRound.date;
  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 shadow-[0_1px_3px_rgb(0_0_0/0.04)]">
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: meta.hex }}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-semibold tracking-tight">{app.company}</h3>
            {app.source === "sourced" && app.rounds.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stage-applied/25 px-2.5 py-0.5 text-xs font-medium text-[#4A6A94]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STAGE_META.applied.hex }} />
                被捞
              </span>
            ) : (
              <StageChip stage={app.stage} />
            )}
            {app.source === "sourced" && app.rounds.length > 0 && (
              <span
                title="这个岗位不是你投递的，是对方主动捞起来的"
                className="rounded-full border border-border px-2 py-0.5 text-[10px] text-ink-faint"
              >
                被捞
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-ink-soft">
            <span className="truncate">{app.role}</span>
            {app.city && (
              <span className="flex items-center gap-1 text-xs text-ink-faint">
                <MapPin className="h-3 w-3" />
                {app.city}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-0.5" data-export-hide>
            <button
              onClick={() => setEditing(true)}
              title="编辑公司信息"
              className="rounded-lg p-1.5 text-ink-faint hover:bg-secondary hover:text-ink"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <ConfirmButton
              label={<Trash2 className="h-3.5 w-3.5" />}
              confirmLabel="确认删除"
              onConfirm={() => removeApplication(app.id)}
              className="rounded-lg p-1.5 text-ink-faint hover:bg-stage-rejected/10 hover:text-[#9C4A4A]"
            />
          </div>
          <div className="text-xs text-ink-faint">
            {app.source === "sourced" ? "捞起于 " : "投递于 "}
            <span className="tabular-nums">
              {headDate.startsWith("20") ? headDate.slice(5) : headDate}
            </span>
          </div>
        </div>
      </div>

      <RoundStepper app={app} />

      {app.status === "active" && upcoming && (
        <div
          className="mt-5 flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ backgroundColor: `${STAGE_META[upcoming.stage].hex}1F` }}
        >
          <Clock3
            className="h-4 w-4 shrink-0"
            style={{ color: STAGE_META[upcoming.stage].deep }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: STAGE_META[upcoming.stage].deep }}
          >
            接下来：{upcoming.title} · {upcoming.date}
            {upcoming.time ? ` ${upcoming.time}` : ""}
          </span>
        </div>
      )}

      {editing && <EditApplicationModal app={app} onClose={() => setEditing(false)} />}
    </div>
  );
}

export default function Timeline() {
  const { apps, clearAll, mergeApps } = useApps();
  const [showAddApp, setShowAddApp] = useState(false);
  const [exportingImg, setExportingImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const longRef = useRef<HTMLDivElement>(null);
  const active = apps.filter((a) => a.status === "active");
  const closed = apps.filter((a) => a.status !== "active");

  const exportLongImage = async () => {
    const node = longRef.current;
    if (!node || exportingImg) return;
    setExportingImg(true);
    try {
      await exportNodeAsPng({ node, filename: `秋招进度长图-${mdOf(new Date())}.png` });
    } catch (err) {
      console.error("导出长图失败", err);
      alert("导出长图失败，可直接用系统截图");
    } finally {
      setExportingImg(false);
    }
  };

  const exportData = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      apps,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `秋招数据备份-${mdOf(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const list = Array.isArray(parsed) ? parsed : parsed?.apps;
      if (!Array.isArray(list)) throw new Error("bad-format");
      const r = mergeApps(list as Application[]);
      alert(
        `导入完成：新增 ${r.added} 家` +
          (r.copies ? `，${r.copies} 家与现有数据冲突、已保留为副本（可删掉不要的）` : "") +
          (r.skipped ? `，内容相同跳过 ${r.skipped} 家` : "")
      );
    } catch {
      alert("文件解析失败，请确认选的是本应用「导出数据」生成的 JSON 文件");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">投递管理</h1>
          <p className="mt-1 text-sm text-ink-faint">
            进行中 {active.length} 家 · 已结束 {closed.length} 家
          </p>
        </div>
        <div className="flex items-center gap-2">
          {apps.length > 0 && (
            <>
              <button
                onClick={exportData}
                title="把当前全部数据下载成 JSON 文件"
                className="flex items-center gap-1 rounded-full px-3 py-2 text-xs text-ink-faint hover:text-ink"
              >
                <Download className="h-3.5 w-3.5" /> 导出数据
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                title="合并另一个窗口导出的数据文件"
                className="flex items-center gap-1 rounded-full px-3 py-2 text-xs text-ink-faint hover:text-ink"
              >
                <Upload className="h-3.5 w-3.5" /> 导入合并
              </button>
              <button
                onClick={exportLongImage}
                disabled={exportingImg}
                title="把全部卡片导出成一张长图（已隐藏操作按钮），方便发小红书"
                className="flex items-center gap-1 rounded-full px-3 py-2 text-xs text-ink-faint hover:text-ink disabled:opacity-50"
              >
                <ImageDown className="h-3.5 w-3.5" /> {exportingImg ? "导出中…" : "导出长图"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={onImportFile}
              />
              <ConfirmButton
                label="清空数据"
                confirmLabel="确认清空全部"
                onConfirm={clearAll}
                className="rounded-full px-3 py-2 text-xs text-ink-faint hover:text-[#9C4A4A]"
              />
            </>
          )}
          <button
            onClick={() => setShowAddApp(true)}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
          >
            + 记录岗位
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("app-zen", { detail: true }))}
            title="隐藏侧边栏，全宽展示页面，方便手工截图"
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"
          >
            <Presentation className="h-3.5 w-3.5" />
            展示模式
          </button>
        </div>
      </header>

      {apps.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border py-20 text-sm text-ink-faint">
          还没有记录，点右上角「+ 记录岗位」开始
        </div>
      ) : (
        <>
          <div ref={longRef} className="frame-board space-y-4 rounded-2xl">
            <div className="exp-grid grid gap-4 2xl:grid-cols-2">
              {active.map((a) => (
                <ApplicationCard key={a.id} app={a} />
              ))}
            </div>

            {closed.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-ink-faint">已归档</h3>
                <div className="exp-grid grid gap-4 2xl:grid-cols-2">
                  {closed.map((a) => (
                    <ApplicationCard key={a.id} app={a} />
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {showAddApp && <QuickAddApplication onClose={() => setShowAddApp(false)} />}
    </div>
  );
}
