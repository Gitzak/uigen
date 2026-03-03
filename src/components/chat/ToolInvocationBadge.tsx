"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolInvocation: {
    toolName: string;
    state: string;
    result?: unknown;
    args: Record<string, unknown>;
  };
}

function basename(path: string): string {
  return path.split("/").pop() || path;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  const command = args.command as string | undefined;
  const path = args.path as string | undefined;
  const fileName = path ? basename(path) : undefined;

  if (toolName === "str_replace_editor") {
    if (!command || !fileName) return "Editing file";
    switch (command) {
      case "create":
        return `Creating ${fileName}`;
      case "str_replace":
      case "insert":
        return `Editing ${fileName}`;
      case "view":
        return `Reading ${fileName}`;
      case "undo_edit":
        return `Undoing edit on ${fileName}`;
      default:
        return "Editing file";
    }
  }

  if (toolName === "file_manager") {
    if (!command || !fileName) return "Managing files";
    switch (command) {
      case "rename":
        return `Renaming ${fileName}`;
      case "delete":
        return `Deleting ${fileName}`;
      default:
        return "Managing files";
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const { toolName, state, result, args } = toolInvocation;
  const label = getLabel(toolName, args);
  const isComplete = state === "result" && result != null;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
