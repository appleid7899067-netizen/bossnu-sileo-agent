export async function webCheck(url: string) {
  if (!/^https:\/\//i.test(url)) throw new Error("web_check requires an HTTPS URL");
  const started = Date.now();
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    finalUrl: response.url,
    durationMs: Date.now() - started,
  };
}
