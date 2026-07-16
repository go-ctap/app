import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LogCode,
  LogEntry,
  LogJournalBatch,
  LogJournalRecord,
  LogLayer,
  LogLevel,
  LogOutcome,
  LogPayload,
  OperationKind,
} from "../../../../bindings/github.com/go-ctap/kit/model";
import { LogCursor } from "../../../../bindings/github.com/go-ctap/kit/service";
import { api } from "$lib/api.js";
import { logController } from "$lib/features/logs/state.svelte.js";
import { setAppLocale } from "$lib/i18n.js";

import LogWorkbench from "./LogWorkbench.svelte";

function appendOperation(sequence = 1, errorMessage?: string) {
  logController.append(new LogJournalRecord({
    sequence,
    entry: new LogEntry({
      timestamp: "2026-07-15T10:00:00.000Z",
      durationMilliseconds: 12,
      layer: LogLayer.LogLayerOperation,
      level: LogLevel.LogLevelInfo,
      outcome: LogOutcome.LogOutcomeSucceeded,
      code: LogCode.LogCodeOperationRun,
      operationKind: OperationKind.OperationInspect,
      sessionId: "session-1",
      operationId: `operation-${sequence}`,
      errorMessage,
      request: new LogPayload({
        json: `{\n  "kind": "inspect",\n  "empty": null,\n  "pin": "[REDACTED]"\n}`,
        originalBytes: 70_000,
        storedBytes: 52,
        truncated: true,
      }),
      response: new LogPayload({
        json: `{\n  "result": "ok",\n  "unused": 0\n}`,
        originalBytes: 15,
        storedBytes: 15,
        truncated: false,
      }),
      redactedFields: ["request.pin"],
    }),
  }));
}

function appendEntry(sequence: number, values: Partial<LogEntry>) {
  logController.append(new LogJournalRecord({
    sequence,
    entry: new LogEntry({
      timestamp: `2026-07-15T10:00:${String(sequence).padStart(2, "0")}.000Z`,
      layer: LogLayer.LogLayerCTAP,
      level: LogLevel.LogLevelInfo,
      outcome: LogOutcome.LogOutcomeSucceeded,
      code: LogCode.LogCodeCTAPCommand,
      operationId: "grouped-operation",
      ...values,
    }),
  }));
}

function layoutRect(element: HTMLElement) {
  const height = element.hasAttribute("data-index") ? 64 : 800;
  return {
    x: 0,
    y: 0,
    top: 0,
    right: 1_200,
    bottom: height,
    left: 0,
    width: 1_200,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("LogWorkbench", () => {
  beforeEach(() => {
    setAppLocale("en");
    logController.clear();
    logController.setQuery("");
    logController.setFilters({ level: "all", layer: "all", outcome: "all" });
    vi.spyOn(api, "clearLogs").mockResolvedValue(new LogCursor({ sequence: 1 }));
    vi.spyOn(api, "readLogs").mockResolvedValue(new LogJournalBatch({ cursor: 1 }));
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return layoutRect(this);
    });
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute("data-index") ? 64 : 800;
    });
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(1_200);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    logController.clear();
  });

  it("shows the empty state before any kit or runtime activity", () => {
    render(LogWorkbench);
    expect(screen.getByText("No log entries yet")).toBeInTheDocument();
  });

  it("shows localized detail tabs, literal JSON, redaction, truncation, search, and clear confirmation", async () => {
    const user = userEvent.setup();
    appendOperation();
    render(LogWorkbench);

    expect(screen.getAllByText("Operation: Overview").length).toBeGreaterThan(0);
    expect(screen.getByText("Private fields were removed: request.pin")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Request" }));
    expect(screen.getByText("This JSON payload was safely truncated from 70000 to 52 bytes.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("region", { name: "Request" }).querySelector("pre.shiki")?.textContent).toBe(`{
  "kind": "inspect",
  "pin": "[REDACTED]"
}`));

    await user.click(screen.getByRole("tab", { name: "Response / Error" }));
    await waitFor(() => expect(screen.getByRole("region", { name: "Response / Error" }).querySelector("pre.shiki")?.textContent).toBe(`{
  "result": "ok"
}`));

    await user.type(screen.getByRole("searchbox"), "no-match");
    expect(screen.getByText("No matching log entries")).toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox"));

    await user.click(screen.getByRole("button", { name: "Clear logs" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear log" }));
    expect(screen.getByText("No log entries yet")).toBeInTheDocument();
  });

  it("shows the retained transport error message", async () => {
    const user = userEvent.setup();
    appendOperation(1, "transport read: io: read/write on closed pipe");
    render(LogWorkbench);

    await user.click(screen.getByRole("tab", { name: "Response / Error" }));
    expect(screen.getByText("transport read: io: read/write on closed pipe")).toBeInTheDocument();
  });

  it("opens a log entry in a sheet and navigates the filtered journal when the workbench is narrow", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(800);
    appendOperation(1);
    appendOperation(2);
    render(LogWorkbench);

    expect(screen.queryByRole("dialog", { name: "Operation: Overview" })).not.toBeInTheDocument();

    const rows = screen.getAllByRole("button", { name: /Operation: Overview/ });
    await user.click(rows.at(-1)!);

    const dialog = screen.getByRole("dialog", { name: "Operation: Overview" });
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    const close = within(dialog).getByRole("button", { name: "Close" });
    const previous = within(dialog).getByRole("button", { name: "Previous log entry" });
    const next = within(dialog).getByRole("button", { name: "Next log entry" });
    expect(within(dialog).getByText("Log entry 2 of 2")).toBeInTheDocument();
    expect(previous).toBeEnabled();
    expect(next).toBeDisabled();

    await user.keyboard("{ArrowUp}");
    expect(within(dialog).getByText("Log entry 2 of 2")).toBeInTheDocument();

    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");

    expect(within(dialog).getByText("Log entry 1 of 2")).toBeInTheDocument();
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");

    expect(within(dialog).getByText("Log entry 2 of 2")).toBeInTheDocument();
    expect(previous).toBeEnabled();
    expect(next).toBeDisabled();

    await user.click(close);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Operation: Overview" })).not.toBeInTheDocument();
    });
  });

  it("navigates the desktop detail panel with Alt+ArrowUp and Alt+ArrowDown", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1_200);
    appendOperation(1);
    appendOperation(2);
    render(LogWorkbench);

    expect(screen.getByText("Log entry 2 of 2")).toBeInTheDocument();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByText("Log entry 2 of 2")).toBeInTheDocument();

    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
    expect(screen.getByText("Log entry 1 of 2")).toBeInTheDocument();

    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(screen.getByText("Log entry 2 of 2")).toBeInTheDocument();
  });

  it("navigates visible tree rows and expands or collapses groups with Alt+Arrow keys", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1_200);
    appendOperation(29);
    appendEntry(30, { command: "authenticatorGetInfo" });
    appendEntry(31, { command: "authenticatorClientPIN" });
    appendEntry(32, {
      layer: LogLayer.LogLayerOperation,
      code: LogCode.LogCodeOperationRun,
      operationKind: OperationKind.OperationListCredentials,
    });
    appendOperation(33);
    const { container } = render(LogWorkbench);

    const overviewRows = screen.getAllByRole("button", { name: /Operation: Overview/ });
    const previous = overviewRows[0];
    const parent = screen.getByRole("button", { name: "Operation: Credential inventory" });

    expect(screen.getByRole("button", {
      name: "Expand events for Operation: Credential inventory",
    })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /CTAP command: authenticatorClientPIN/ })).not.toBeInTheDocument();

    await fireEvent.pointerMove(window, { clientX: 120, clientY: 80 });
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
    expect(parent).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(".log-workbench"))
      .toHaveAttribute("data-keyboard-navigation", "true");

    await fireEvent.pointerMove(window, { clientX: 120, clientY: 80 });
    expect(container.querySelector(".log-workbench"))
      .toHaveAttribute("data-keyboard-navigation", "true");

    await fireEvent.pointerMove(window, { clientX: 121, clientY: 80 });
    expect(container.querySelector(".log-workbench"))
      .not.toHaveAttribute("data-keyboard-navigation");

    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    const firstChild = screen.getByRole("button", { name: /CTAP command: authenticatorGetInfo/ });
    const secondChild = screen.getByRole("button", { name: /CTAP command: authenticatorClientPIN/ });
    expect(firstChild).toHaveAttribute("aria-pressed", "true");
    await fireEvent.pointerMove(window, { clientX: 121, clientY: 80 });
    expect(container.querySelector(".log-workbench"))
      .toHaveAttribute("data-keyboard-navigation", "true");
    expect(screen.getByRole("button", {
      name: "Collapse events for Operation: Credential inventory",
    })).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(secondChild).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{Alt>}{ArrowLeft}{/Alt}");
    expect(parent).toHaveAttribute("aria-pressed", "true");
    expect(firstChild).toBeInTheDocument();
    expect(secondChild).toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: "Collapse events for Operation: Credential inventory",
    })).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Alt>}{ArrowLeft}{/Alt}");
    expect(parent).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /CTAP command: authenticatorGetInfo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /CTAP command: authenticatorClientPIN/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: "Expand events for Operation: Credential inventory",
    })).toHaveAttribute("aria-expanded", "false");

    await user.keyboard("{Alt>}{ArrowLeft}{/Alt}");
    expect(previous).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(parent).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(screen.getByRole("button", { name: /CTAP command: authenticatorGetInfo/ }))
      .toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(screen.getByRole("button", { name: /CTAP command: authenticatorClientPIN/ }))
      .toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(screen.getAllByRole("button", { name: /Operation: Overview/ }).at(-1))
      .toHaveAttribute("aria-pressed", "true");
  });

  it("groups correlated CTAP failures under their failed application operation", async () => {
    const user = userEvent.setup();
    appendEntry(10, {
      level: LogLevel.LogLevelError,
      outcome: LogOutcome.LogOutcomeFailed,
      command: "authenticatorClientPIN",
      subCommand: "getPinUvAuthTokenUsingPinWithPermissions",
    });
    appendEntry(11, {
      layer: LogLayer.LogLayerOperation,
      level: LogLevel.LogLevelError,
      outcome: LogOutcome.LogOutcomeFailed,
      code: LogCode.LogCodeOperationRun,
      operationKind: OperationKind.OperationListCredentials,
    });
    appendOperation(12);
    render(LogWorkbench);

    const toggle = screen.getByRole("button", {
      name: "Collapse events for Operation: Credential inventory",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const command = screen.getByRole("button", {
      name: /CTAP command: authenticatorClientPIN · getPinUvAuthTokenUsingPinWithPermissions/,
    });
    expect(command).toHaveAttribute("data-nested", "true");
    expect(command.closest("[data-tree-end='true']")).not.toBeNull();
    await user.click(command);

    const group = toggle.closest("[data-log-operation-group]");
    expect(group).toHaveAttribute("data-group-selected", "true");
    expect(toggle).not.toHaveAttribute("data-slot");
    expect(command).not.toHaveAttribute("data-slot");

    expect(screen.getByRole("heading", {
      name: "CTAP command: authenticatorClientPIN · getPinUvAuthTokenUsingPinWithPermissions",
    })).toBeInTheDocument();
  });

  it("keeps the group toggle separate and opens details from the operation body on a narrow workbench", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(800);
    appendEntry(30, { command: "authenticatorClientPIN" });
    appendEntry(31, {
      layer: LogLayer.LogLayerOperation,
      code: LogCode.LogCodeOperationRun,
      operationKind: OperationKind.OperationListCredentials,
    });
    render(LogWorkbench);

    const toggle = screen.getByRole("button", {
      name: "Expand events for Operation: Credential inventory",
    });
    expect(screen.queryByRole("dialog", { name: "Operation: Credential inventory" })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.queryByRole("dialog", { name: "Operation: Credential inventory" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: "Collapse events for Operation: Credential inventory",
    })).toHaveAttribute("aria-expanded", "true");

    const operation = screen.getByRole("button", { name: "Operation: Credential inventory" });
    await user.click(operation);

    expect(screen.getByRole("dialog", { name: "Operation: Credential inventory" })).toBeInTheDocument();
  });

  it("keeps the operation heading visible when a layer filter matches only its child", async () => {
    appendEntry(20, { command: "authenticatorClientPIN" });
    appendEntry(21, {
      layer: LogLayer.LogLayerOperation,
      code: LogCode.LogCodeOperationRun,
      operationKind: OperationKind.OperationListCredentials,
    });
    render(LogWorkbench);

    logController.setFilters({ level: "all", layer: LogLayer.LogLayerCTAP, outcome: "all" });

    await waitFor(() => {
      expect(screen.getByRole("button", {
        name: "Collapse events for Operation: Credential inventory",
      })).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("button", { name: /CTAP command: authenticatorClientPIN/ })).toBeInTheDocument();
    });
  });

  it("reports when the runtime retention boundary was crossed", () => {
    logController.applyBatch(new LogJournalBatch({
      entries: [new LogJournalRecord({
        sequence: 1,
        entry: new LogEntry({
          timestamp: "2026-07-15T10:00:00.000Z",
          layer: LogLayer.LogLayerService,
          level: LogLevel.LogLevelInfo,
          outcome: LogOutcome.LogOutcomeEvent,
          code: LogCode.LogCodeDiscoveryChanged,
        }),
      })],
      cursor: 1,
      truncated: true,
    }));

    render(LogWorkbench);
    expect(screen.getByText("Earlier log entries are no longer available")).toBeInTheDocument();
  });

  it("renders only the visible window for a large journal", async () => {
    for (let sequence = 1; sequence <= 200; sequence += 1) appendOperation(sequence);
    logController.setFollowLive(false);

    const { container } = render(LogWorkbench);

    await waitFor(() => {
      const renderedRows = container.querySelectorAll(".log-virtual-row");
      expect(renderedRows.length).toBeGreaterThan(0);
      expect(renderedRows.length).toBeLessThan(200);
    });
  });

  it("scrolls the virtual journal to the end when Follow live is enabled", async () => {
    const user = userEvent.setup();
    appendOperation(1);
    appendOperation(2);
    logController.setFollowLive(false);

    const { container } = render(LogWorkbench);
    const viewport = container.querySelector<HTMLElement>("[data-slot='scroll-area-viewport']")!;
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo;

    await user.click(screen.getByRole("button", { name: "Follow live" }));

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
    });
  });
});
