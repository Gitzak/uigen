import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

function make(toolName: string, args: Record<string, unknown>, state = "result", result: unknown = "ok") {
  return { toolName, args, state, result };
}

// str_replace_editor labels
test("shows 'Creating' for str_replace_editor create command", () => {
  render(<ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "create", path: "/src/Card.jsx" })} />);
  expect(screen.getByText("Creating Card.jsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor str_replace command", () => {
  render(<ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "str_replace", path: "/src/App.jsx" })} />);
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor insert command", () => {
  render(<ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "insert", path: "/src/utils.ts" })} />);
  expect(screen.getByText("Editing utils.ts")).toBeDefined();
});

test("shows 'Reading' for str_replace_editor view command", () => {
  render(<ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "view", path: "/src/index.ts" })} />);
  expect(screen.getByText("Reading index.ts")).toBeDefined();
});

test("shows 'Undoing edit on' for str_replace_editor undo_edit command", () => {
  render(<ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "undo_edit", path: "/src/App.jsx" })} />);
  expect(screen.getByText("Undoing edit on App.jsx")).toBeDefined();
});

// file_manager labels
test("shows 'Renaming' for file_manager rename command", () => {
  render(<ToolInvocationBadge toolInvocation={make("file_manager", { command: "rename", path: "/src/old.js", new_path: "/src/new.js" })} />);
  expect(screen.getByText("Renaming old.js")).toBeDefined();
});

test("shows 'Deleting' for file_manager delete command", () => {
  render(<ToolInvocationBadge toolInvocation={make("file_manager", { command: "delete", path: "/src/old.js" })} />);
  expect(screen.getByText("Deleting old.js")).toBeDefined();
});

// Unknown tool fallback
test("shows raw tool name for unknown tools", () => {
  render(<ToolInvocationBadge toolInvocation={make("some_custom_tool", {})} />);
  expect(screen.getByText("some_custom_tool")).toBeDefined();
});

// State-based indicator
test("shows green dot when state is result and result is present", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "create", path: "/src/Card.jsx" }, "result", "ok")} />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("shows spinner when in progress (no result)", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={{ toolName: "str_replace_editor", args: { command: "create", path: "/src/Card.jsx" }, state: "call", result: undefined }} />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});
