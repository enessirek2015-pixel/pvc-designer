import type { DesktopApi } from "./pvc";

declare global {
  interface Window {
    desktopApi?: DesktopApi;
  }
}

export {};
