try {
  const response = await fetch('http://127.0.0.1:8080/readyz', { signal: AbortSignal.timeout(4000) });
  await response.body?.cancel();
  if (!response.ok) process.exitCode = 1;
} catch { process.exitCode = 1; }
