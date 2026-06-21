import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { InteractionPrompt, MDSLookupEnvelope, SessionSnapshot } from "../../bindings/github.com/go-ctap/kit/service";
import { setAppLocale } from "$lib/i18n";
import {
  activeScreen,
  appError,
  devices,
  operationStatus,
  overviewBioSensorEnvelope,
  overviewEnvelope,
  overviewLoading,
  overviewMDSLoading,
  overviewMDSLookup,
  pendingInteraction,
  selectedDevice,
  selectedLogEntryId,
  selectedSelector,
  sessionStatus,
  sessions,
  statusBar,
  workbenchLog,
} from "./stores";

const serviceMocks = vi.hoisted(() => ({
  BioSensorInfo: vi.fn(),
  CancelOperation: vi.fn(),
  CloseAllSessions: vi.fn(),
  Discover: vi.fn(),
  Inspect: vi.fn(),
  LookupMDS: vi.fn(),
  OpenSession: vi.fn(),
  ResolveInteraction: vi.fn(),
  Sessions: vi.fn(),
}));

vi.mock("../../bindings/fidobench/ctapkitservice", () => serviceMocks);

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function device(id: string): DeviceReport {
  return {
    deviceId: id,
    ordinalAlias: id,
    stableId: true,
    transport: "hid" as DeviceReport["transport"],
    path: id,
    vendorId: 1,
    productId: 2,
    product: id,
  };
}

function snapshot(item: DeviceReport, sessionId = `session-${item.deviceId}`): SessionSnapshot {
  return {
    id: sessionId,
    info: {
      device: item,
      closed: false,
    },
    running: false,
    openedAt: "2026-06-22T00:00:00Z",
    updatedAt: "2026-06-22T00:00:00Z",
  } as SessionSnapshot;
}

function inspectEnvelope(item: DeviceReport) {
  return {
    operationId: `inspect-${item.deviceId}`,
    sessionId: `session-${item.deviceId}`,
    kind: OperationKind.OperationInspect,
    result: {
      result: {
        device: item,
        info: {
          versions: [],
          aaguid: "",
          options: {},
          conformanceFindings: [],
        },
      },
    },
  };
}

function resetStores() {
  activeScreen.set("overview");
  appError.set(null);
  devices.set([]);
  operationStatus.set(null);
  overviewBioSensorEnvelope.set(null);
  overviewEnvelope.set(null);
  overviewLoading.set(false);
  overviewMDSLoading.set(false);
  overviewMDSLookup.set(null);
  pendingInteraction.set(null);
  selectedDevice.set(null);
  selectedLogEntryId.set("");
  selectedSelector.set("");
  sessionStatus.set({ state: "idle", selectedSelector: "", selectedDevice: null });
  sessions.set([]);
  statusBar.set({ activeOperation: null, lastOutcome: null, actions: [] });
  workbenchLog.set([]);
}

describe("controller lifecycle", () => {
  beforeEach(() => {
    setAppLocale("en");
    vi.clearAllMocks();
    resetStores();
    serviceMocks.BioSensorInfo.mockResolvedValue(null);
    serviceMocks.CancelOperation.mockResolvedValue(true);
    serviceMocks.CloseAllSessions.mockResolvedValue([]);
    serviceMocks.LookupMDS.mockResolvedValue({ result: null } as MDSLookupEnvelope);
    serviceMocks.ResolveInteraction.mockResolvedValue(true);
    serviceMocks.Sessions.mockResolvedValue([]);
  });

  it("auto-selects one discovered authenticator and loads overview once", async () => {
    const token = device("token-1");
    const { bootstrap } = await import("./controller");
    serviceMocks.Discover.mockResolvedValue({ devices: [token] });
    serviceMocks.OpenSession.mockResolvedValue(snapshot(token));
    serviceMocks.Inspect.mockResolvedValue(inspectEnvelope(token));

    await bootstrap();

    expect(get(selectedSelector)).toBe("token-1");
    expect(serviceMocks.OpenSession).toHaveBeenCalledWith({ selector: "token-1" });
    expect(serviceMocks.Inspect).toHaveBeenCalledTimes(1);
    expect(serviceMocks.Inspect).toHaveBeenCalledWith({ sessionId: "session-token-1" });
  });

  it("does not auto-select when discovery returns multiple authenticators", async () => {
    const { bootstrap } = await import("./controller");
    serviceMocks.Discover.mockResolvedValue({ devices: [device("token-1"), device("token-2")] });

    await bootstrap();

    expect(get(selectedSelector)).toBe("");
    expect(serviceMocks.OpenSession).not.toHaveBeenCalled();
    expect(serviceMocks.Inspect).not.toHaveBeenCalled();
  });

  it("loads overview once when navigating back to overview with an existing selected session", async () => {
    const token = device("token-1");
    const { navigateToScreen } = await import("./controller");
    devices.set([token]);
    selectedSelector.set("token-1");
    selectedDevice.set(token);
    sessionStatus.set({ state: "ready", selectedSelector: "token-1", selectedDevice: token, sessionId: "session-token-1" });
    activeScreen.set("settings");
    serviceMocks.Inspect.mockResolvedValue(inspectEnvelope(token));

    await navigateToScreen("overview");
    await navigateToScreen("overview");

    expect(get(activeScreen)).toBe("overview");
    expect(serviceMocks.Inspect).toHaveBeenCalledTimes(1);
  });

  it("clearing selection clears per-device state and resolves pending interaction", async () => {
    const token = device("token-1");
    const { selectToken } = await import("./controller");
    devices.set([token]);
    selectedSelector.set("token-1");
    selectedDevice.set(token);
    overviewEnvelope.set(inspectEnvelope(token));
    overviewBioSensorEnvelope.set(inspectEnvelope(token));
    overviewMDSLookup.set({ result: null });
    pendingInteraction.set({
      interactionId: "interaction-1",
      operationId: "operation-1",
      sessionId: "session-token-1",
      request: { kind: "confirm" },
    } as InteractionPrompt);

    await selectToken("");

    expect(get(selectedSelector)).toBe("");
    expect(get(overviewEnvelope)).toBeNull();
    expect(get(overviewBioSensorEnvelope)).toBeNull();
    expect(get(overviewMDSLookup)).toBeNull();
    expect(get(pendingInteraction)).toBeNull();
    expect(serviceMocks.CancelOperation).toHaveBeenCalledWith({ operationId: "operation-1" });
    expect(serviceMocks.ResolveInteraction).toHaveBeenCalledWith({
      interactionId: "interaction-1",
      confirmed: false,
      canceled: true,
    });
  });

  it("ignores stale overview and MDS responses after selection changes", async () => {
    const token1 = device("token-1");
    const token2 = device("token-2");
    const firstInspect = deferred<ReturnType<typeof inspectEnvelope>>();
    const secondInspect = deferred<ReturnType<typeof inspectEnvelope>>();
    const firstMDS = deferred<MDSLookupEnvelope>();
    const secondMDS = deferred<MDSLookupEnvelope>();
    const { loadOverviewMDS, selectToken } = await import("./controller");
    devices.set([token1, token2]);
    serviceMocks.OpenSession
      .mockResolvedValueOnce(snapshot(token1))
      .mockResolvedValueOnce(snapshot(token2));
    serviceMocks.Inspect
      .mockReturnValueOnce(firstInspect.promise)
      .mockReturnValueOnce(secondInspect.promise);

    const selectFirst = selectToken("token-1");
    await vi.waitFor(() => expect(serviceMocks.Inspect).toHaveBeenCalledTimes(1));
    const selectSecond = selectToken("token-2");
    await vi.waitFor(() => expect(serviceMocks.Inspect).toHaveBeenCalledTimes(2));

    firstInspect.resolve(inspectEnvelope(token1));
    secondInspect.resolve(inspectEnvelope(token2));
    await Promise.all([selectFirst, selectSecond]);
    expect(get(overviewEnvelope)?.sessionId).toBe("session-token-2");

    selectedSelector.set("token-1");
    serviceMocks.LookupMDS.mockReturnValueOnce(firstMDS.promise).mockReturnValueOnce(secondMDS.promise);
    const loadFirst = loadOverviewMDS("aaguid-1", false, "token-1");
    selectedSelector.set("token-2");
    const loadSecond = loadOverviewMDS("aaguid-2", false, "token-2");

    firstMDS.resolve({ result: { entry: { aaguid: "stale" } } } as MDSLookupEnvelope);
    secondMDS.resolve({ result: { entry: { aaguid: "current" } } } as MDSLookupEnvelope);
    await Promise.all([loadFirst, loadSecond]);

    expect(get(overviewMDSLookup)?.result?.entry?.aaguid).toBe("current");
  });
});
