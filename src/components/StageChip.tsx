import { STAGE_META, type Stage } from "@/data/stages";
import { cn } from "@/lib/utils";

export function StageChip({ stage, className }: { stage: Stage; className?: string }) {
  const meta = STAGE_META[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        meta.chip,
        className
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.hex }}
      />
      {meta.label}
    </span>
  );
}

export function StageDot({
  stage,
  size = 10,
  className,
}: {
  stage: Stage;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block rounded-full shrink-0", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: STAGE_META[stage].hex,
      }}
    />
  );
}
