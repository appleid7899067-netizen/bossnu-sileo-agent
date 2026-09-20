export type AgentPhase = "plan" | "select" | "act" | "observe" | "refine" | "verify";

export type AgentStep = { phase: AgentPhase; detail: string };

export function mutationExpected(prompt: string) {
  return /แก้|เขียน|สร้าง|ลบ|update|write|fix|repair|deploy|ดีพลอย|modify|change|commit/i.test(prompt);
}

export function verificationRequested(prompt: string) {
  return /test|verify|ตรวจ|เช็ก|build|ci|ผ่าน|ทำงานไหม|health|status|502|503|เว็บ|url/i.test(prompt);
}

export function diagnoseFailure(error: unknown, toolName = "tool") {
  const raw = String(error instanceof Error ? error.message : error ?? "").slice(0, 1000);
  const t = raw.toLowerCase();
  if (/401|unauthorized|authentication|token|api key/.test(t)) return `สาเหตุที่เป็นไปได้: authentication/credential ของ ${toolName} ไม่ผ่าน`;
  if (/403|forbidden|permission|access denied/.test(t)) return `สาเหตุที่เป็นไปได้: permission/access ของ ${toolName} ไม่พอ`;
  if (/404|not found|module not found/.test(t)) return `สาเหตุที่เป็นไปได้: resource/route/module ของ ${toolName} ไม่พบ`;
  if (/502|bad gateway/.test(t)) return `สาเหตุที่เป็นไปได้: upstream/deployment gateway ของ ${toolName} มีปัญหา HTTP 502`;
  if (/503|service unavailable/.test(t)) return `สาเหตุที่เป็นไปได้: service ของ ${toolName} unavailable`;
  if (/timeout|timed out|etimedout|econnreset|socket hang up/.test(t)) return `สาเหตุที่เป็นไปได้: network/service timeout จาก ${toolName}`;
  if (/typescript|type error|ts\\d+/.test(t)) return `สาเหตุที่เป็นไปได้: TypeScript/type-check failure จาก ${toolName}`;
  if (/npm err|pnpm|yarn|package|cannot find module/.test(t)) return `สาเหตุที่เป็นไปได้: dependency/package resolution failure จาก ${toolName}`;
  if (/referenceerror|typeerror|undefined is not/.test(t)) return `สาเหตุที่เป็นไปได้: runtime JavaScript error จาก ${toolName}`;
  if (/syntaxerror|parse error|unexpected token/.test(t)) return `สาเหตุที่เป็นไปได้: syntax/parse failure จาก ${toolName}`;
  return `ต้องอ่าน error จริงจาก ${toolName} แล้วซ่อมจากหลักฐาน ห้ามเดา`;
}

export function verificationEvidence(name: string, value: unknown) {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (name === "web_check" && r.ok === true && Number(r.status) >= 200 && Number(r.status) < 300) return `web_check ผ่าน HTTP ${r.status}`;
  if (r.verified === true || r.success === true) return `${name} รายงาน verified/success`;
  if (r.status === "completed" && r.conclusion === "success") return `${name} workflow completed successfully`;
  return null;
}
