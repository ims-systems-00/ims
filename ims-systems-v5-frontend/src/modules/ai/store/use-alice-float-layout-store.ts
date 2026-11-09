import { create } from "zustand";

const STORAGE_KEY = "ims.alice.float.layout.v2";

export const ALICE_FAB_SIZE = 56;
export const ALICE_PANEL_DEFAULT_WIDTH = 520;
export const ALICE_PANEL_MIN_WIDTH = 360;
export const ALICE_PANEL_MAX_WIDTH = 720;
export const ALICE_PANEL_MARGIN = 12;
/** Above app sidebar (50) and right-side sheets (50); body-portaled. */
export const ALICE_FLOAT_Z_INDEX = 200;

type Point = { x: number; y: number };

type AliceFloatLayoutState = {
  /** Top-left of FAB; null = default bottom-right. */
  fab: Point | null;
  /** Top-left of open chat panel; null = default near FAB / bottom-right. */
  panel: Point | null;
  panelWidth: number;
  setFab: (point: Point) => void;
  setPanel: (point: Point) => void;
  setPanelWidth: (width: number) => void;
  resetLayout: () => void;
};

type PersistedLayout = {
  fab: Point | null;
  panel: Point | null;
  panelWidth: number;
};

function readPersisted(): PersistedLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedLayout;
    if (
      typeof parsed.panelWidth !== "number" ||
      Number.isNaN(parsed.panelWidth)
    ) {
      return null;
    }
    return {
      fab: parsed.fab ?? null,
      panel: parsed.panel ?? null,
      panelWidth: parsed.panelWidth,
    };
  } catch {
    return null;
  }
}

function writePersisted(state: PersistedLayout): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

const persisted = readPersisted();

/**
 * Floating Alice FAB + panel position / width (persisted locally).
 */
export const useAliceFloatLayoutStore = create<AliceFloatLayoutState>(
  (set, get) => ({
    fab: persisted?.fab ?? null,
    panel: persisted?.panel ?? null,
    panelWidth: persisted?.panelWidth ?? ALICE_PANEL_DEFAULT_WIDTH,
    setFab: (fab) => {
      set({ fab });
      const s = get();
      writePersisted({
        fab,
        panel: s.panel,
        panelWidth: s.panelWidth,
      });
    },
    setPanel: (panel) => {
      set({ panel });
      const s = get();
      writePersisted({
        fab: s.fab,
        panel,
        panelWidth: s.panelWidth,
      });
    },
    setPanelWidth: (panelWidth) => {
      set({ panelWidth });
      const s = get();
      writePersisted({
        fab: s.fab,
        panel: s.panel,
        panelWidth,
      });
    },
    resetLayout: () => {
      set({
        fab: null,
        panel: null,
        panelWidth: ALICE_PANEL_DEFAULT_WIDTH,
      });
      writePersisted({
        fab: null,
        panel: null,
        panelWidth: ALICE_PANEL_DEFAULT_WIDTH,
      });
    },
  })
);

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function clampFabPosition(
  x: number,
  y: number,
  vw = typeof window !== "undefined" ? window.innerWidth : 1280,
  vh = typeof window !== "undefined" ? window.innerHeight : 800
): Point {
  return {
    x: clamp(x, ALICE_PANEL_MARGIN, vw - ALICE_FAB_SIZE - ALICE_PANEL_MARGIN),
    y: clamp(y, ALICE_PANEL_MARGIN, vh - ALICE_FAB_SIZE - ALICE_PANEL_MARGIN),
  };
}

export function clampPanelPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  vw = typeof window !== "undefined" ? window.innerWidth : 1280,
  vh = typeof window !== "undefined" ? window.innerHeight : 800
): Point {
  const maxX = Math.max(ALICE_PANEL_MARGIN, vw - width - ALICE_PANEL_MARGIN);
  const maxY = Math.max(ALICE_PANEL_MARGIN, vh - height - ALICE_PANEL_MARGIN);
  return {
    x: clamp(x, ALICE_PANEL_MARGIN, maxX),
    y: clamp(y, ALICE_PANEL_MARGIN, maxY),
  };
}

export function clampPanelWidth(
  width: number,
  vw = typeof window !== "undefined" ? window.innerWidth : 1280
): number {
  const max = Math.min(
    ALICE_PANEL_MAX_WIDTH,
    Math.max(ALICE_PANEL_MIN_WIDTH, vw - ALICE_PANEL_MARGIN * 2)
  );
  return clamp(width, ALICE_PANEL_MIN_WIDTH, max);
}

export function defaultFabPosition(
  vw = typeof window !== "undefined" ? window.innerWidth : 1280,
  vh = typeof window !== "undefined" ? window.innerHeight : 800
): Point {
  return {
    x: vw - ALICE_FAB_SIZE - 20,
    y: vh - ALICE_FAB_SIZE - 20,
  };
}

export function defaultPanelPosition(
  width: number,
  height: number,
  fab: Point | null,
  vw = typeof window !== "undefined" ? window.innerWidth : 1280,
  vh = typeof window !== "undefined" ? window.innerHeight : 800
): Point {
  const fabPos = fab ?? defaultFabPosition(vw, vh);
  // Prefer above the FAB, right-aligned to FAB.
  const x = fabPos.x + ALICE_FAB_SIZE - width;
  const y = fabPos.y - height - 16;
  return clampPanelPosition(x, y, width, height, vw, vh);
}
