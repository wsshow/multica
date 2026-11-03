// Keep the upstream analytics API inert so feature updates can retain their call sites.
export const EVENT_SCHEMA_VERSION = 2;
export interface AnalyticsConfig {
  key: string;
  host: string;
  appVersion?: string;
  environment?: string;
}
export type ClientType = "desktop" | "web";
export interface CaptureEventOptions {
  sendInstantly?: boolean;
  onCaptured?: () => void;
}
export function detectClientType(): ClientType {
  if (typeof window === "undefined") return "web";
  const w = window as unknown as { electron?: unknown; desktopAPI?: unknown };
  return w.electron || w.desktopAPI || /Electron/i.test(navigator.userAgent)
    ? "desktop"
    : "web";
}
export function initAnalytics(_config: AnalyticsConfig | null | undefined): boolean { return false; }
export function identify(_userId: string, _props?: Record<string, unknown>): void {}
export function resetAnalytics(): void {}
export function captureEvent(_name: string, _props?: Record<string, unknown>, _options?: CaptureEventOptions): void {}
export function captureException(_error: unknown, _props?: Record<string, unknown>): void {}
export function setPersonProperties(_props: Record<string, unknown>): void {}
export function captureSignupSource(): void {}
