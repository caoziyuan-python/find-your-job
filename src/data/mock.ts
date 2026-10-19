import type { Stage } from "./stages";

export interface TranscriptLine {
  speaker: "我" | "面试官";
  time: string;
  text: string;
}

export interface Round {
  id: string;
  stage: Stage;
  title: string; // 例：一面（业务）
  date: string; // 例：10-09
  weekday?: string;
  time?: string; // 例：14:00-15:00
  duration?: string; // 转写时长
  result?: "pass" | "fail" | "pending";
  interviewer?: string;
  rating?: number; // 自评 1-5
  note?: string;
  transcript?: TranscriptLine[];
  review?: string; // 大模型生成的复盘
  hasAudio?: boolean;
}

export interface Application {
  id: string;
  company: string;
  anonymousName: string; // 匿名模式展示名
  role: string;
  city: string;
  stage: Stage; // 当前阶段
  status: "active" | "offer" | "rejected";
  appliedAt: string;
  /** 来源：主动投递 / 被捞（HR 或面试官主动捞起，没有投递动作）。缺省视为 applied */
  source?: "applied" | "sourced";
  /** 这家流程里没有笔试环节，建议下一轮时跳过笔试 */
  skipWritten?: boolean;
  rounds: Round[];
  nextEvent?: { label: string; date: string; time: string; stage: Stage };
}

export const applications: Application[] = [
  {
    id: "demo-a",
    company: "示例公司A（虚构数据）",
    anonymousName: "某AI创业公司",
    role: "AI 产品经理（Demo）",
    city: "上海",
    stage: "first",
    status: "active",
    appliedAt: "10-08",
    rounds: [
      {
        id: "demo-a-r1",
        stage: "applied",
        title: "投递简历",
        date: "10-08",
        result: "pass",
      },
      {
        id: "demo-a-r2",
        stage: "written",
        title: "笔试",
        date: "10-11",
        result: "pass",
        duration: "90min",
        note: "行测 + 产品 Sense 题",
      },
      {
        id: "demo-a-r3",
        stage: "first",
        title: "一面 · 业务",
        date: "10-15",
        weekday: "周三",
        time: "14:00 - 14:45",
        duration: "45min",
        result: "pending",
        rating: 4,
        interviewer: "业务负责人",
        note: "项目深挖 + 场景题，整体顺利",
        hasAudio: true,
        transcript: [
          {
            speaker: "面试官",
            time: "00:05",
            text: "先介绍一下你自己，重点讲一个你最有成就感的项目。",
          },
          {
            speaker: "我",
            time: "00:30",
            text: "好的。我最近从零到一独立做了一款秋招进度管理工具，从需求定义、页面设计到开发落地全流程独立完成……（示例转写内容）",
          },
          {
            speaker: "面试官",
            time: "03:20",
            text: "这个工具的核心指标你会怎么定义？",
          },
          {
            speaker: "我",
            time: "03:45",
            text: "我会看留存类的指标，比如次日/7 日回访率，以及单次会话里添加记录的操作完成率……（示例转写内容）",
          },
        ],
      },
    ],
  },
  {
    id: "demo-b",
    company: "示例公司B（虚构数据）",
    anonymousName: "某大厂",
    role: "数据产品经理（Demo）",
    city: "北京",
    stage: "written",
    status: "active",
    appliedAt: "10-10",
    rounds: [
      {
        id: "demo-b-r1",
        stage: "applied",
        title: "投递简历",
        date: "10-10",
        result: "pass",
      },
      {
        id: "demo-b-r2",
        stage: "written",
        title: "笔试",
        date: "10-13",
        result: "pending",
        duration: "120min",
        note: "SQL + 数据分析 + 产品案例分析",
      },
    ],
  },
];

export const weekRange = "本周（示例）";
