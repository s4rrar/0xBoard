import fs from "fs";
import path from "path";
import { app, BrowserWindow, screen } from "electron";

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1280,
  height: 800,
  isMaximized: false,
};

export class WindowStateManager {
  private stateFilePath: string;
  private state: WindowState;

  constructor() {
    this.stateFilePath = path.join(
      app.getPath("userData"),
      "window-state.json",
    );
    this.state = this.loadState();
  }

  public getState(): WindowState {
    return this.state;
  }

  public track(win: BrowserWindow) {
    let saveTimeout: NodeJS.Timeout | null = null;

    const debouncedSave = () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        this.updateState(win);
        this.saveState();
      }, 500);
    };

    win.on("resize", debouncedSave);
    win.on("move", debouncedSave);
    win.on("close", () => {
      this.updateState(win);
      this.saveState();
    });
  }

  private updateState(win: BrowserWindow) {
    if (win.isDestroyed()) {
      return;
    }
    const isMaximized = win.isMaximized();
    this.state.isMaximized = isMaximized;

    if (!isMaximized) {
      const bounds = win.getBounds();
      this.state.x = bounds.x;
      this.state.y = bounds.y;
      this.state.width = bounds.width;
      this.state.height = bounds.height;
    }
  }

  private loadState(): WindowState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const raw = fs.readFileSync(this.stateFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (this.validateBounds(parsed)) {
          return { ...DEFAULT_STATE, ...parsed };
        }
      }
    } catch (e) {
      console.warn("Failed to load saved window state, using defaults:", e);
    }
    return { ...DEFAULT_STATE };
  }

  private validateBounds(state: Partial<WindowState>): boolean {
    if (
      typeof state.width !== "number" ||
      typeof state.height !== "number" ||
      state.width < 400 ||
      state.height < 300
    ) {
      return false;
    }

    if (typeof state.x === "number" && typeof state.y === "number") {
      const displays = screen.getAllDisplays();
      const isVisibleOnAnyDisplay = displays.some((display) => {
        const { x, y, width, height } = display.bounds;
        return (
          state.x! >= x - 20 &&
          state.y! >= y - 20 &&
          state.x! < x + width &&
          state.y! < y + height
        );
      });
      return isVisibleOnAnyDisplay;
    }

    return true;
  }

  private saveState() {
    try {
      const dir = path.dirname(this.stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.stateFilePath,
        JSON.stringify(this.state, null, 2),
        "utf-8",
      );
    } catch (e) {
      console.error("Failed to save window state:", e);
    }
  }
}
