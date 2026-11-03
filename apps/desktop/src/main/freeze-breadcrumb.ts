import type { FreezeBreadcrumb } from "../shared/freeze-breadcrumb";
export type { FreezeBreadcrumb };
export const FREEZE_BREADCRUMB_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export function writeFreezeBreadcrumb(_filePath: string, _breadcrumb: FreezeBreadcrumb): void {}
export function clearFreezeBreadcrumb(_filePath: string, _ownerId?: string): void {}
export function readFreezeBreadcrumb(_filePath: string, _now = Date.now()): FreezeBreadcrumb | null { return null; }
export function ackFreezeBreadcrumb(_filePath: string, _ts: number): void {}
