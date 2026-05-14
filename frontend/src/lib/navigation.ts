import { push, replace } from "svelte-spa-router";
import { m } from "../paraglide/messages.js";

export const WORKBENCH_SCREEN_ORDER = ["overview", "credentials", "largeBlobs", "config", "lab", "logs"] as const;

export type WorkbenchScreenId = (typeof WORKBENCH_SCREEN_ORDER)[number];

export const WORKBENCH_ROUTES: Record<WorkbenchScreenId, string> = {
  overview: "/overview",
  credentials: "/credentials",
  largeBlobs: "/large-blobs",
  config: "/config",
  lab: "/lab",
  logs: "/logs",
};

export const DEFAULT_WORKBENCH_SCREEN: WorkbenchScreenId = "overview";
export const DEFAULT_WORKBENCH_ROUTE = WORKBENCH_ROUTES[DEFAULT_WORKBENCH_SCREEN];

export const WORKBENCH_SCREEN_META: Record<WorkbenchScreenId, { id: WorkbenchScreenId; path: string; label: () => string }> = {
  overview: { id: "overview", path: WORKBENCH_ROUTES.overview, label: () => m.nav_overview() },
  credentials: { id: "credentials", path: WORKBENCH_ROUTES.credentials, label: () => m.nav_credentials() },
  largeBlobs: { id: "largeBlobs", path: WORKBENCH_ROUTES.largeBlobs, label: () => m.nav_large_blobs() },
  config: { id: "config", path: WORKBENCH_ROUTES.config, label: () => m.nav_config() },
  lab: { id: "lab", path: WORKBENCH_ROUTES.lab, label: () => m.nav_lab() },
  logs: { id: "logs", path: WORKBENCH_ROUTES.logs, label: () => m.nav_logs() },
};

export function isWorkbenchScreen(value: string): value is WorkbenchScreenId {
  return WORKBENCH_SCREEN_ORDER.includes(value as WorkbenchScreenId);
}

export function routeForScreen(screen: WorkbenchScreenId) {
  return WORKBENCH_ROUTES[screen] || DEFAULT_WORKBENCH_ROUTE;
}

export function screenFromPath(path: string): WorkbenchScreenId | null {
  const entry = WORKBENCH_SCREEN_ORDER.find((screen) => WORKBENCH_ROUTES[screen] === path);
  return entry || null;
}

export function navigateToScreen(screen: WorkbenchScreenId, options: { replace?: boolean } = {}) {
  const destination = routeForScreen(screen);
  return options.replace ? replace(destination) : push(destination);
}
