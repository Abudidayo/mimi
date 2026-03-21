export type BrowserProgressStatus = "running" | "completed" | "failed";

export interface BrowserProgressEvent {
  id: string;
  timestamp: number;
  message: string;
}

export interface BrowserProgressRun {
  id: string;
  label: string;
  status: BrowserProgressStatus;
  startUrl: string;
  startedAt: number;
  updatedAt: number;
  sessionUrl?: string;
  summary?: string;
  events: BrowserProgressEvent[];
}

declare global {
  var __browserProgressRuns: Map<string, BrowserProgressRun> | undefined;
}

function getStore() {
  if (!globalThis.__browserProgressRuns) {
    globalThis.__browserProgressRuns = new Map<string, BrowserProgressRun>();
  }

  return globalThis.__browserProgressRuns;
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function startBrowserProgressRun(label: string, startUrl: string) {
  const run: BrowserProgressRun = {
    id: createId("browser"),
    label,
    status: "running",
    startUrl,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    events: [],
  };

  getStore().set(run.id, run);
  return run.id;
}

export function appendBrowserProgressEvent(runId: string, message: string) {
  const run = getStore().get(runId);
  if (!run) return;

  run.events.push({
    id: createId("evt"),
    timestamp: Date.now(),
    message,
  });
  run.updatedAt = Date.now();

  if (run.events.length > 40) {
    run.events = run.events.slice(-40);
  }
}

export function finishBrowserProgressRun(
  runId: string,
  status: BrowserProgressStatus,
  summary?: string,
  sessionUrl?: string
) {
  const run = getStore().get(runId);
  if (!run) return;

  run.status = status;
  run.summary = summary;
  run.sessionUrl = sessionUrl;
  run.updatedAt = Date.now();
}

export function listBrowserProgressRuns() {
  return Array.from(getStore().values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4);
}
