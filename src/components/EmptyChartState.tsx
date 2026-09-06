import { IconChartLine } from "@tabler/icons-react";

export default function EmptyChartState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full py-10 px-4">
      <IconChartLine size={28} stroke={1.5} className="text-muted mb-3" aria-hidden="true" />
      <p className="text-ink font-medium mb-1">{title}</p>
      <p className="text-muted text-sm max-w-xs">{body}</p>
    </div>
  );
}
