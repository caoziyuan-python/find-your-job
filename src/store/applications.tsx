import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { applications as seed, type Application, type Round } from "@/data/mock";
import { STAGE_ORDER, type Stage } from "@/data/stages";

const KEY = "qiuzhao.apps.v1";

/* ---------- 日期工具 ---------- */
export function mdOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}-${day}`;
}

export function dateInputValue(d: Date): string {
  return `${d.getFullYear()}-${mdOf(d)}`;
}

export function mdOfInput(v: string): string {
  return v.slice(5); // yyyy-mm-dd → mm-dd
}

export function nextStageOf(current: Stage, skipWritten = false): Stage {
  if (current === "rejected") return "applied";
  const i = STAGE_ORDER.indexOf(current as (typeof STAGE_ORDER)[number]);
  let next = STAGE_ORDER[Math.min(i + 1, STAGE_ORDER.length - 1)];
  if (skipWritten && next === "written") next = "first";
  return next;
}

/** 需要本人赴约的环节（投递/评估中只是流程状态，不算待办） */
export const ACTION_STAGES: Stage[] = ["written", "first", "second", "hr"];

/** 从真实轮次推导「接下来的安排」：未出结果且日期不早于今天（投递/评估中/已挂节点不算） */
export function upcomingRound(app: Application): Round | undefined {
  const today = mdOf(new Date());
  return [...app.rounds]
    .reverse()
    .find(
      (r) =>
        r.result === "pending" &&
        ACTION_STAGES.includes(r.stage) &&
        r.date >= today
    );
}

/* ---------- Store ---------- */
interface AppsContextValue {
  apps: Application[];
  addApplication: (data: {
    company: string;
    role: string;
    city?: string;
    note?: string;
    source?: "applied" | "sourced";
  }) => void;
  updateApplication: (
    appId: string,
    patch: Partial<Pick<Application, "company" | "role" | "city" | "source" | "skipWritten" | "appliedAt">>
  ) => void;
  removeApplication: (appId: string) => void;
  addRound: (appId: string, round: Round) => void;
  updateRound: (appId: string, roundId: string, patch: Partial<Round>) => void;
  removeRound: (appId: string, roundId: string) => void;
  clearAll: () => void;
  /** 合并导入：id 不冲突直接并入；冲突且内容不同的保留两边（导入方变副本），不覆盖已有数据 */
  mergeApps: (incoming: Application[]) => { added: number; copies: number; skipped: number };
}

const Ctx = createContext<AppsContextValue | null>(null);

/** 轮次变化后，用最后一轮反推公司当前阶段/状态（全局唯一事实来源）：
 *  挂了 / 出现「已挂」节点 → 归档为已挂；最后一轮是 Offer → 归档为 Offer；其余一律回到进行中 */
function withRecomputedStage(app: Application, rounds: Round[]): Application {
  const last = rounds[rounds.length - 1];
  if (!last) return { ...app, rounds };
  if (last.result === "fail" || last.stage === "rejected") {
    return { ...app, rounds, stage: "rejected", status: "rejected" };
  }
  if (last.stage === "offer") {
    return { ...app, rounds, stage: "offer", status: "offer" };
  }
  return { ...app, rounds, stage: last.stage, status: "active" };
}

/** 数据对齐：不管数据从哪来（本地存档 / 导入合并），都按轮次重算一遍 stage/status，
 *  保证「进行中 / Offer / 已挂」在所有页面口径一致 */
function normalizeApp(app: Application): Application {
  return withRecomputedStage(app, app.rounds);
}

function load(): Application[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (JSON.parse(raw) as Application[]).map(normalizeApp);
  } catch {
    /* 数据损坏时回退到种子数据 */
  }
  return seed;
}

export function ApplicationsProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<Application[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(apps));
    } catch {
      /* 存储失败不阻塞交互 */
    }
  }, [apps]);

  const addApplication: AppsContextValue["addApplication"] = (data) => {
    const id = `app-${crypto.randomUUID().slice(0, 8)}`;
    const today = mdOf(new Date());
    const sourced = data.source === "sourced";
    setApps((prev) => [
      ...prev,
      {
        id,
        company: data.company,
        anonymousName: "某公司",
        role: data.role,
        city: data.city ?? "",
        stage: "applied",
        status: "active",
        appliedAt: today,
        source: data.source ?? "applied",
        // 被捞起来的岗位没有「投递简历」这一节点
        rounds: sourced
          ? []
          : [
              {
                id: `${id}-r1`,
                stage: "applied",
                title: "投递简历",
                date: today,
                result: "pending",
                note: data.note || undefined,
              },
            ],
      },
    ]);
  };

  const addRound: AppsContextValue["addRound"] = (appId, round) => {
    setApps((prev) =>
      prev.map((a) =>
        a.id === appId ? withRecomputedStage(a, [...a.rounds, round]) : a
      )
    );
  };

  const updateApplication: AppsContextValue["updateApplication"] = (appId, patch) => {
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, ...patch } : a)));
  };

  const removeApplication: AppsContextValue["removeApplication"] = (appId) => {
    setApps((prev) => prev.filter((a) => a.id !== appId));
  };

  const updateRound: AppsContextValue["updateRound"] = (appId, roundId, patch) => {
    setApps((prev) =>
      prev.map((a) => {
        if (a.id !== appId) return a;
        const rounds = a.rounds.map((r) => (r.id === roundId ? { ...r, ...patch } : r));
        return withRecomputedStage(a, rounds);
      })
    );
  };

  const removeRound: AppsContextValue["removeRound"] = (appId, roundId) => {
    setApps((prev) =>
      prev.map((a) => {
        if (a.id !== appId) return a;
        const rounds = a.rounds.filter((r) => r.id !== roundId);
        return withRecomputedStage(a, rounds);
      })
    );
  };

  const clearAll: AppsContextValue["clearAll"] = () => setApps([]);

  const mergeApps: AppsContextValue["mergeApps"] = (incoming) => {
    const next = [...apps];
    const res = { added: 0, copies: 0, skipped: 0 };
    for (const app of incoming) {
      if (!app || typeof app.id !== "string" || !Array.isArray(app.rounds)) continue;
      const norm = normalizeApp(app);
      const local = next.find((a) => a.id === norm.id);
      if (!local) {
        next.push(norm);
        res.added++;
      } else if (JSON.stringify(local) === JSON.stringify(norm)) {
        res.skipped++;
      } else {
        // 同 id 但内容不同：保留两边，导入的换新 id 作为副本，轮次 id 一并重排
        const nid = `app-${crypto.randomUUID().slice(0, 8)}`;
        next.push({
          ...norm,
          id: nid,
          rounds: norm.rounds.map((r) => ({ ...r, id: `${nid}-${r.id}` })),
        });
        res.copies++;
      }
    }
    setApps(next);
    return res;
  };

  return (
    <Ctx.Provider
      value={{
        apps,
        addApplication,
        updateApplication,
        removeApplication,
        addRound,
        updateRound,
        removeRound,
        clearAll,
        mergeApps,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApps(): AppsContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApps must be used within ApplicationsProvider");
  return v;
}
