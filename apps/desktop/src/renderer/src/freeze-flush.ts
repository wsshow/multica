import type { FreezeBreadcrumb } from "../../shared/freeze-breadcrumb";
import type { CaptureEventOptions } from "@multica/core/analytics";
export const FREEZE_ACK_GRACE_MS = 10_000;
export interface FlushFreezeBreadcrumbDeps {
  getLastFreeze: () => FreezeBreadcrumb | null;
  ackFreeze: (ts: number) => void;
  graceMs?: number;
  capture: (name: string, props: Record<string, unknown>, options: CaptureEventOptions) => void;
}
export function flushFreezeBreadcrumb(_deps: FlushFreezeBreadcrumbDeps): () => void { return () => {}; }
export function buildFreezeEventProps(_breadcrumb: FreezeBreadcrumb): Record<string, unknown> { return {}; }
