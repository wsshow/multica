"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getDevRecording,
  installDevRecorder,
  recordDevRoute,
  recordDevSyncStatus,
  subscribeDevRecording,
  type DevRecording,
} from "@multica/core/diagnostics";

/** Start the recorder and feed it what only the platform knows: route and sync. */
export function useDevRecorder(route: string, sync: string): DevRecording {
  const queryClient = useQueryClient();
  useEffect(() => installDevRecorder(queryClient), [queryClient]);
  useEffect(() => recordDevRoute(route), [route]);
  useEffect(() => recordDevSyncStatus(sync), [sync]);
  return useSyncExternalStore(subscribeDevRecording, getDevRecording, getDevRecording);
}

/** Wall clock, re-read every `intervalMs` so trailing windows keep moving. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Collection is disabled; do not present zero as a measured result. */
export function useMainThreadBlocked(_recording: DevRecording, _now: number): number | null {
  return null;
}

export function useNavDuration(_route: string): number | null {
  return null;
}
