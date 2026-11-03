import type { StorageAdapter } from "../types/storage";
import type { ClientIdentity } from "../platform/types";
export function utcDay(date = new Date()): string { return date.toISOString().slice(0, 10); }
export function ClientUsageReporter(_props: { storage: StorageAdapter; identity?: ClientIdentity }) { return null; }
