// This boundary stays inert even if an upstream layout supplies a measurement ID.
export function installGoogleAnalytics(_measurementId: string): () => void { return () => {}; }
