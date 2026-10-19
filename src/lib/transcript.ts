import type { TranscriptLine } from "@/data/mock";

/**
 * 把「录音转文字」工具导出的纯文本解析成对话结构。
 * 兼容格式：
 *   我：balabala
 *   面试官：balabala
 *   [00:03] 我：balabala   /   00:03 面试官 balabala
 * 没有说话人标记的行，沿用上一行的说话人。
 */
export function parseTranscript(text: string): TranscriptLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  let last: "我" | "面试官" = "面试官";
  const out: TranscriptLine[] = [];

  for (const raw of lines) {
    let rest = raw;
    let time = "";
    const t = rest.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[:：]?\s*/);
    if (t) {
      time = t[1];
      rest = rest.slice(t[0].length).trim();
    }

    let speaker: "我" | "面试官" | null = null;
    if (/^我\s*[:：]/.test(rest)) {
      speaker = "我";
      rest = rest.replace(/^我\s*[:：]\s*/, "");
    } else if (/^(面试官|面试)\s*[:：]/.test(rest)) {
      speaker = "面试官";
      rest = rest.replace(/^(面试官|面试)\s*[:：]\s*/, "");
    }

    if (!rest) continue;

    const sp: "我" | "面试官" = speaker ?? last;
    last = sp;
    out.push({ speaker: sp, time, text: rest });
  }
  return out;
}
