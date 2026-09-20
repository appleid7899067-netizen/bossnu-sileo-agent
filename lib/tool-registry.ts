export type ToolCapability = "code-repository" | "deploy" | "verify" | "debug" | "code" | "general";

export function classifyTool(name: string, description = ""): ToolCapability {
  const t = `${name} ${description}`.toLowerCase();
  if (/deploy|hosting|railway|vercel|netlify/.test(t)) return "deploy";
  if (/github|git|repo|commit|pull request|branch/.test(t)) return "code-repository";
  if (/test|verify|check|lint|build|ci|workflow|health|http|status/.test(t)) return "verify";
  if (/debug|error|log|diagnos/.test(t)) return "debug";
  if (/file|read|write|edit|code/.test(t)) return "code";
  return "general";
}

export function selectCapabilities(prompt: string) {
  const t = prompt.toLowerCase();
  const out = new Set<ToolCapability>(["general"]);
  if (/github|repo|repository|โค้ด|code|ไฟล์|แก้|bug|error|commit|branch/.test(t)) out.add("code-repository");
  if (/deploy|ดีพลอย|vercel|netlify|railway/.test(t)) out.add("deploy");
  if (/test|verify|ตรวจ|เช็ก|build|ci|ผ่าน|เว็บ|http|health|502|503|timeout|url/.test(t)) out.add("verify");
  if (/bug|error|502|500|503|ล่ม|แก้|debug|diagnos/.test(t)) out.add("debug");
  if (/code|โค้ด|แก้ไฟล์|ไฟล์|รัน|run/.test(t)) out.add("code");
  return [...out];
}
