import { useEffect, useRef, useState, useCallback } from "react";
import { APP_NAME } from "@excalidraw/common";
import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";
import {
  restoreElements,
  restoreAppState,
} from "@excalidraw/excalidraw/data/restore";
import { exportScene } from "@excalidraw/excalidraw/scene/export";
import {
  getNonDeletedElements,
  CaptureUpdateAction,
} from "@excalidraw/element";
import type {
  AppState,
  ExcalidrawImperativeAPI,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/element/types";
import type { Theme } from "@excalidraw/element/types";
import type { FileData, MenuAction } from "./electron/types";

interface UseElectronOptions {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  editorTheme: Theme;
  setAppTheme: (theme: Theme | "system") => void;
}

export function useElectron({
  excalidrawAPI,
  editorTheme,
  setAppTheme,
}: UseElectronOptions) {
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const activeFilePathRef = useRef<string | null>(null);
  activeFilePathRef.current = activeFilePath;

  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  isDirtyRef.current = isDirty;

  const lastSavedSceneRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  // Sync window title and dirty indicator with Electron main process
  const updateWindowState = useCallback(
    (filePath: string | null, dirty: boolean) => {
      if (window.electronAPI) {
        window.electronAPI.updateWindowState({
          filePath,
          isDirty: dirty,
        });
      }
    },
    [],
  );

  const getSceneData = useCallback(() => {
    if (!excalidrawAPI) return null;
    const elements = getNonDeletedElements(excalidrawAPI.getSceneElements());
    const appState = excalidrawAPI.getAppState();
    const files = excalidrawAPI.getFiles();
    return { elements, appState, files };
  }, [excalidrawAPI]);

  const loadFileData = useCallback(
    async (fileData: FileData) => {
      if (!excalidrawAPI) return;
      try {
        const parsed = JSON.parse(fileData.data);
        const elements = restoreElements(parsed.elements || [], null, {
          repairBindings: true,
          deleteInvisibleElements: true,
        });
        const appState = restoreAppState(
          {
            ...parsed.appState,
            theme: editorTheme,
          },
          excalidrawAPI.getAppState(),
        );

        if (parsed.files) {
          excalidrawAPI.addFiles(Object.values(parsed.files));
        }

        excalidrawAPI.updateScene({
          elements,
          appState,
          captureUpdate: CaptureUpdateAction.NEVER,
        });

        setActiveFilePath(fileData.filePath);
        lastSavedSceneRef.current = fileData.data;
        setIsDirty(false);
        updateWindowState(fileData.filePath, false);

        if (elements.length > 0) {
          excalidrawAPI.setViewport({
            target: elements,
            fit: "contain",
            animation: false,
          });
        }

        excalidrawAPI.setToast({
          message: `Opened "${fileData.fileName}"`,
          duration: 2000,
        });
      } catch (err: any) {
        console.error("Failed to load Excalidraw file:", err);
        excalidrawAPI.setToast({
          message: `Failed to open file: ${err?.message || "Invalid format"}`,
          duration: 3000,
        });
      }
    },
    [excalidrawAPI, editorTheme, updateWindowState],
  );

  const handleSaveFile = useCallback(async (): Promise<boolean> => {
    if (!excalidrawAPI || !window.electronAPI) return false;
    const sceneData = getSceneData();
    if (!sceneData) return false;

    const json = serializeAsJSON(
      sceneData.elements,
      sceneData.appState,
      sceneData.files,
      "local",
    );

    const result = await window.electronAPI.saveFile(
      json,
      activeFilePathRef.current,
    );

    if (result.canceled) {
      return false;
    }

    if (result.error) {
      excalidrawAPI.setToast({
        message: `Save error: ${result.error}`,
        duration: 3000,
      });
      return false;
    }

    if (result.filePath) {
      setActiveFilePath(result.filePath);
      lastSavedSceneRef.current = json;
      setIsDirty(false);
      updateWindowState(result.filePath, false);
      const name = result.filePath.split(/[/\\]/).pop();
      excalidrawAPI.setToast({
        message: `Saved to "${name}"`,
        duration: 2000,
      });
      return true;
    }
    return false;
  }, [excalidrawAPI, getSceneData, updateWindowState]);

  const handleSaveFileAs = useCallback(async (): Promise<boolean> => {
    if (!excalidrawAPI || !window.electronAPI) return false;
    const sceneData = getSceneData();
    if (!sceneData) return false;

    const json = serializeAsJSON(
      sceneData.elements,
      sceneData.appState,
      sceneData.files,
      "local",
    );

    const defaultName = excalidrawAPI.getName() || "drawing";
    const result = await window.electronAPI.saveFileAs(json, defaultName);

    if (result.canceled) {
      return false;
    }

    if (result.error) {
      excalidrawAPI.setToast({
        message: `Save error: ${result.error}`,
        duration: 3000,
      });
      return false;
    }

    if (result.filePath) {
      setActiveFilePath(result.filePath);
      lastSavedSceneRef.current = json;
      setIsDirty(false);
      updateWindowState(result.filePath, false);
      const name = result.filePath.split(/[/\\]/).pop();
      excalidrawAPI.setToast({
        message: `Saved as "${name}"`,
        duration: 2000,
      });
      return true;
    }
    return false;
  }, [excalidrawAPI, getSceneData, updateWindowState]);

  // Check unsaved changes with confirmation prompt
  const confirmDiscardIfDirty = useCallback(async (): Promise<boolean> => {
    if (!isDirtyRef.current || !window.electronAPI) {
      return true;
    }
    const fileName = activeFilePathRef.current
      ? activeFilePathRef.current.split(/[/\\]/).pop()
      : "Untitled";

    const answer = await window.electronAPI.confirmDiscardChanges(fileName);
    if (answer === "save") {
      return await handleSaveFile();
    }
    if (answer === "discard") {
      return true;
    }
    return false; // cancel
  }, [handleSaveFile]);

  const handleNewFile = useCallback(async () => {
    if (!excalidrawAPI) return;
    const canProceed = await confirmDiscardIfDirty();
    if (!canProceed) return;

    excalidrawAPI.resetScene();
    setActiveFilePath(null);
    lastSavedSceneRef.current = null;
    setIsDirty(false);
    updateWindowState(null, false);
    excalidrawAPI.setToast({
      message: "New drawing created",
      duration: 1500,
    });
  }, [excalidrawAPI, confirmDiscardIfDirty, updateWindowState]);

  const handleOpenFile = useCallback(async () => {
    if (!excalidrawAPI || !window.electronAPI) return;
    const canProceed = await confirmDiscardIfDirty();
    if (!canProceed) return;

    const fileData = await window.electronAPI.openFile();
    if (fileData) {
      await loadFileData(fileData);
    }
  }, [excalidrawAPI, confirmDiscardIfDirty, loadFileData]);

  const handleExportPng = useCallback(async () => {
    if (!excalidrawAPI || !window.electronAPI) return;
    const sceneData = getSceneData();
    if (!sceneData) return;

    try {
      const blob = await exportScene({
        type: "png",
        data: {
          elements: sceneData.elements,
          appState: sceneData.appState,
          files: sceneData.files,
        },
      });

      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const defaultName = excalidrawAPI.getName() || "drawing";

      const result = await window.electronAPI.exportImage(
        bytes,
        defaultName,
        "png",
      );
      if (!result.canceled && result.filePath) {
        excalidrawAPI.setToast({
          message: `Exported PNG to "${result.filePath.split(/[/\\]/).pop()}"`,
          duration: 2000,
        });
      }
    } catch (err: any) {
      console.error("Export PNG failed:", err);
      excalidrawAPI.setToast({
        message: `Export failed: ${err?.message || "Unknown error"}`,
        duration: 3000,
      });
    }
  }, [excalidrawAPI, getSceneData]);

  const handleExportSvg = useCallback(async () => {
    if (!excalidrawAPI || !window.electronAPI) return;
    const sceneData = getSceneData();
    if (!sceneData) return;

    try {
      const svg = await exportScene({
        type: "svg",
        data: {
          elements: sceneData.elements,
          appState: sceneData.appState,
          files: sceneData.files,
        },
      });

      const defaultName = excalidrawAPI.getName() || "drawing";
      const result = await window.electronAPI.exportImage(
        svg.outerHTML,
        defaultName,
        "svg",
      );
      if (!result.canceled && result.filePath) {
        excalidrawAPI.setToast({
          message: `Exported SVG to "${result.filePath.split(/[/\\]/).pop()}"`,
          duration: 2000,
        });
      }
    } catch (err: any) {
      console.error("Export SVG failed:", err);
      excalidrawAPI.setToast({
        message: `Export failed: ${err?.message || "Unknown error"}`,
        duration: 3000,
      });
    }
  }, [excalidrawAPI, getSceneData]);

  // Handle menu actions from Electron
  const handleMenuAction = useCallback(
    async (action: MenuAction) => {
      if (!excalidrawAPI) return;
      const appState = excalidrawAPI.getAppState();

      switch (action) {
        case "new-file":
          await handleNewFile();
          break;
        case "open-file":
          await handleOpenFile();
          break;
        case "save-file":
          await handleSaveFile();
          break;
        case "save-file-as":
          await handleSaveFileAs();
          break;
        case "export-png":
          await handleExportPng();
          break;
        case "export-svg":
          await handleExportSvg();
          break;
        case "undo":
          window.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "z",
              ctrlKey: true,
              metaKey: true,
              bubbles: true,
            }),
          );
          break;
        case "redo":
          window.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "y",
              ctrlKey: true,
              metaKey: true,
              bubbles: true,
            }),
          );
          break;
        case "zoom-in": {
          const currentZoom = appState.zoom.value;
          const nextZoom = Math.min(currentZoom * 1.25, 30);
          excalidrawAPI.updateScene({
            appState: { zoom: { value: nextZoom as any } },
          });
          break;
        }
        case "zoom-out": {
          const currentZoom = appState.zoom.value;
          const nextZoom = Math.max(currentZoom / 1.25, 0.1);
          excalidrawAPI.updateScene({
            appState: { zoom: { value: nextZoom as any } },
          });
          break;
        }
        case "reset-zoom": {
          excalidrawAPI.updateScene({
            appState: { zoom: { value: 1 as any }, scrollX: 0, scrollY: 0 },
          });
          break;
        }
        case "toggle-theme":
          setAppTheme(editorTheme === "dark" ? "light" : "dark");
          break;
        case "clear-canvas": {
          const canProceed = await confirmDiscardIfDirty();
          if (canProceed) {
            excalidrawAPI.resetScene();
            setIsDirty(false);
            updateWindowState(activeFilePathRef.current, false);
          }
          break;
        }
        case "about": {
          const version = window.electronAPI
            ? await window.electronAPI.getAppVersion()
            : "1.0.0";
          excalidrawAPI.setToast({
            message: `${APP_NAME} Desktop v${version}`,
            duration: 3000,
          });
          break;
        }
      }
    },
    [
      excalidrawAPI,
      editorTheme,
      setAppTheme,
      handleNewFile,
      handleOpenFile,
      handleSaveFile,
      handleSaveFileAs,
      handleExportPng,
      handleExportSvg,
      confirmDiscardIfDirty,
      updateWindowState,
    ],
  );

  // Setup listeners when Electron API is available
  useEffect(() => {
    if (!window.electronAPI || !excalidrawAPI) return;

    // Check for initial file opened on launch
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      window.electronAPI.getInitialFile().then((fileData) => {
        if (fileData) {
          loadFileData(fileData);
        }
      });
    }

    // Subscribe to menu actions
    const unsubMenu = window.electronAPI.onMenuAction(handleMenuAction);

    // Subscribe to files opened via OS or recent files
    const unsubFileOpened = window.electronAPI.onFileOpened(
      async (fileData) => {
        const canProceed = await confirmDiscardIfDirty();
        if (canProceed) {
          await loadFileData(fileData);
        }
      },
    );

    // Check dirty state when window close is requested
    const unsubCheckDirty = window.electronAPI.onCheckDirtyBeforeClose(
      async () => {
        if (!isDirtyRef.current) {
          return { shouldClose: true };
        }
        const fileName = activeFilePathRef.current
          ? activeFilePathRef.current.split(/[/\\]/).pop()
          : "Untitled";

        const answer = await window.electronAPI!.confirmDiscardChanges(
          fileName,
        );
        if (answer === "save") {
          const saved = await handleSaveFile();
          return { shouldClose: saved };
        }
        if (answer === "discard") {
          return { shouldClose: true };
        }
        return { shouldClose: false };
      },
    );

    // Native Drag and Drop handling for .excalidraw files
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!e.dataTransfer || e.dataTransfer.files.length === 0) return;
      const file = e.dataTransfer.files[0];

      if (
        file.name.endsWith(".excalidraw") ||
        (file.name.endsWith(".json") && !file.type.startsWith("image/"))
      ) {
        const canProceed = await confirmDiscardIfDirty();
        if (!canProceed) return;

        const pathVal = (file as any).path || file.name;
        const text = await file.text();
        await loadFileData({
          filePath: pathVal,
          fileName: file.name,
          data: text,
        });
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      unsubMenu();
      unsubFileOpened();
      unsubCheckDirty();
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [
    excalidrawAPI,
    handleMenuAction,
    loadFileData,
    confirmDiscardIfDirty,
    handleSaveFile,
  ]);

  // Track scene changes to update dirty state
  const onSceneChange = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      if (!window.electronAPI) return;

      if (!lastSavedSceneRef.current) {
        // If never saved and elements exist, it's dirty
        const hasElements = elements.length > 0;
        if (hasElements !== isDirtyRef.current) {
          setIsDirty(hasElements);
          updateWindowState(activeFilePathRef.current, hasElements);
        }
        return;
      }

      // If saved before, compare current JSON
      const currentJson = serializeAsJSON(elements, appState, files, "local");
      const dirty = currentJson !== lastSavedSceneRef.current;
      if (dirty !== isDirtyRef.current) {
        setIsDirty(dirty);
        updateWindowState(activeFilePathRef.current, dirty);
      }
    },
    [updateWindowState],
  );

  return {
    isElectron: !!window.electronAPI,
    activeFilePath,
    isDirty,
    onSceneChange,
    handleNewFile,
    handleOpenFile,
    handleSaveFile,
    handleSaveFileAs,
    handleExportPng,
    handleExportSvg,
  };
}
