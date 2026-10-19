export type Stage =
  | "applied"
  | "screening"
  | "written"
  | "first"
  | "second"
  | "hr"
  | "offer"
  | "rejected";

export const STAGE_ORDER: Stage[] = [
  "applied",
  "screening",
  "written",
  "first",
  "second",
  "hr",
  "offer",
];

export const STAGE_META: Record<
  Stage,
  { label: string; hex: string; deep: string; chip: string }
> = {
  applied: {
    label: "已投递",
    hex: "#A8C5E8",
    deep: "#4A6A94",
    chip: "bg-stage-applied/25 text-[#4A6A94]",
  },
  screening: {
    label: "评估中",
    hex: "#D8D2C4",
    deep: "#7D7565",
    chip: "bg-stage-screening/40 text-[#7D7565]",
  },
  written: {
    label: "笔试",
    hex: "#9CCFC3",
    deep: "#3E7A6D",
    chip: "bg-stage-written/30 text-[#3E7A6D]",
  },
  first: {
    label: "一面",
    hex: "#F2C57C",
    deep: "#9A6B1F",
    chip: "bg-stage-first/30 text-[#9A6B1F]",
  },
  second: {
    label: "二面",
    hex: "#F09A7E",
    deep: "#A3543A",
    chip: "bg-stage-second/25 text-[#A3543A]",
  },
  hr: {
    label: "HR面",
    hex: "#B8A9D9",
    deep: "#6A5896",
    chip: "bg-stage-hr/25 text-[#6A5896]",
  },
  offer: {
    label: "Offer",
    hex: "#7FB069",
    deep: "#4A7538",
    chip: "bg-stage-offer/25 text-[#4A7538]",
  },
  rejected: {
    label: "已挂",
    hex: "#D97B7B",
    deep: "#9C4A4A",
    chip: "bg-stage-rejected/20 text-[#9C4A4A]",
  },
};

export const stageHex = (s: Stage) => STAGE_META[s].hex;
export const stageDeep = (s: Stage) => STAGE_META[s].deep;
