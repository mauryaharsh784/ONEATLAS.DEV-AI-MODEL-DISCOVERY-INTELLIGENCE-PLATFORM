import { AudioLines, Braces, Brain, Eye, FileText, Globe, ImageIcon, Layers, Mic, MousePointerClick, Type, Video, Wrench, Zap, type LucideIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const CAPABILITY_META: Record<string, { label: string; icon: LucideIcon }> = {
  reasoning: { label: "Reasoning", icon: Brain },
  vision: { label: "Vision input", icon: Eye },
  tool_calling: { label: "Tool calling", icon: Wrench },
  structured_output: { label: "Structured output", icon: Braces },
  prompt_caching: { label: "Prompt caching", icon: Zap },
  pdf_input: { label: "PDF input", icon: FileText },
  audio_input: { label: "Audio input", icon: Mic },
  web_search: { label: "Web search", icon: Globe },
  computer_use: { label: "Computer use", icon: MousePointerClick },
  parallel_tools: { label: "Parallel tool calls", icon: Layers },
};
export const MODALITY_META: Record<string, { label: string; icon: LucideIcon }> = {
  TEXT: { label: "Text", icon: Type }, IMAGE: { label: "Image", icon: ImageIcon }, AUDIO: { label: "Audio", icon: AudioLines },
  VIDEO: { label: "Video", icon: Video }, FILE: { label: "File / PDF", icon: FileText },
};
export const TYPE_LABEL: Record<string, string> = {
  TEXT: "Text", IMAGE: "Image", EMBEDDING: "Embedding", VIDEO: "Video", SPEECH: "Speech", TRANSCRIPTION: "Transcription", RERANKING: "Reranking", REALTIME: "Realtime",
};
export const PROVIDER_TYPE_LABEL: Record<string, string> = {
  FIRST_PARTY: "First-party", CLOUD_PLATFORM: "Cloud platform", INFERENCE_HOST: "Inference host", GATEWAY: "Gateway",
};

const CORE = ["reasoning", "tool_calling", "structured_output", "vision", "prompt_caching"];

/** Compact capability glyph row. Each glyph has an accessible name and a tooltip stating yes / not listed. */
export function CapabilityIcons({ caps, keys = CORE, className }: { caps: string[]; keys?: string[]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {keys.map((k) => {
        const m = CAPABILITY_META[k];
        const has = caps.includes(k);
        return (
          <Tooltip key={k}>
            <TooltipTrigger asChild>
              <span className={cn("inline-flex size-6 items-center justify-center rounded-md transition-colors duration-150", has ? "bg-primary/12 text-primary hover:bg-primary/20" : "text-muted-foreground/25 hover:bg-accent/50")}>
                <m.icon className="size-3.5" aria-label={`${m.label}: ${has ? "yes" : "not listed"}`} />
              </span>
            </TooltipTrigger>
            <TooltipContent>{m.label}: {has ? "supported" : "not listed"}</TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}

export function ModalityIcons({ modalities, className }: { modalities: string[]; className?: string }) {
  if (!modalities.length) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-muted-foreground", className)}>
      {modalities.map((m) => {
        const mm = MODALITY_META[m];
        if (!mm) return null;
        return (
          <Tooltip key={m}>
            <TooltipTrigger asChild><span className="inline-flex hover:text-foreground"><mm.icon className="size-3.5" aria-label={mm.label} /></span></TooltipTrigger>
            <TooltipContent>{mm.label} input</TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}
