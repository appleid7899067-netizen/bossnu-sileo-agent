import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { diagnoseFailure, mutationExpected, selectCapabilities, verificationEvidence } from "@/lib/agent-loop";
import { webCheck } from "@/lib/web-check";
import { getGithubWorkflowStatus, readGithubFile, writeGithubFile } from "@/lib/github-agent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PUTER_BASE = "https://api.puter.com/puterai/openai/v1";

const AGENTS = {
  general: "ผู้ช่วยทั่วไป Level 10",
  coder: "นักพัฒนา Level 10",
  researcher: "นักวิจัย Level 10",
} as const;

function chooseAgent(text: string) {
  const t = text.toLowerCase();
  if (/(โค้ด|code|bug|error|deploy|vercel|railway|github|gitlab|api|โปรเจกต์|แก้|สร้าง|ลบ)/i.test(t)) return "coder";
  if (/(ค้นหา|วิจัย|ข้อมูล|ล่าสุด|compare|เปรียบเทียบ|research)/i.test(t)) return "researcher";
  return "general";
}

function extractUrls(text: string) {
  return text.match(/https:\/\/[^\s)\]}>,]+/gi) ?? [];
}

export async function POST(req: Request) {
  const token = process.env.PUTER_AUTH_TOKEN;
  if (!token) return Response.json({ error: "PUTER_AUTH_TOKEN is not configured" }, { status: 503 });

  try {
    const {
      messages,
      system,
      model,
    }: { messages: UIMessage[]; system?: string; model?: string } = await req.json();

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const userText = lastUser?.parts?.filter((p) => p.type === "text").map((p) => p.text).join(" ") || "";
    const agentId = chooseAgent(userText);
    const agentName = AGENTS[agentId];
    const capabilities = selectCapabilities(userText);
    const needsMutation = mutationExpected(userText);
    const targetUrls = extractUrls(userText);

    const puter = createOpenAI({ apiKey: token, baseURL: PUTER_BASE });

    const result = streamText({
      model: puter(model || "gpt-5.4-nano"),
      system: system || `คุณคือ BossnuSilelo Agent Workspace
Agent: ${agentName} (${agentId})
Tool capabilities selected: ${capabilities.join(", ")}

คุณใช้ protocol แบบ Bosses:
PLAN → SELECT → ACT → OBSERVE → REFINE → VERIFY

กติกาสำคัญ:
1. ผู้ใช้บอกเป้าหมาย บอสวางแผนและเลือกเครื่องมือเอง
2. งานแก้/สร้าง/ลบ/deploy ถือเป็น mutation ต้องมีหลักฐานตรวจสอบก่อนประกาศสำเร็จ
3. หลัง tool ทำงาน ให้ดูผลจริงก่อนตัดสินใจขั้นต่อไป
4. ถ้า tool ล้มเหลว ให้วิเคราะห์ error จริง, เปลี่ยนวิธีหรือแก้สาเหตุ แล้วลองใหม่
5. งาน GitHub ต้องอ่านไฟล์จริงก่อนแก้เมื่อเป็นการอัปเดตไฟล์ที่มีอยู่
6. หลัง github_write_file ให้ใช้ commit SHA ที่ได้เพื่อตรวจ GitHub checks เมื่อมี checks ให้ตรวจ
7. ห้ามเขียนไฟล์ซ้ำแบบเดิมหากยังไม่ได้อ่านผลล่าสุด
8. ห้ามวนเรียก tool เดิมแบบเดิมโดยไม่มีข้อมูลใหม่
9. ถ้ามี URL ของเว็บและงานเกี่ยวกับ deploy/health/เว็บ ต้องใช้ web_check ตรวจ URL จริง
10. verify_result เป็น gate สรุปผล ไม่ใช่สิ่งที่ใช้แทนการตรวจจริง
11. ห้ามอ้างว่าแก้ GitHub/ไฟล์/deploy สำเร็จ หากยังไม่มี external tool ที่ทำ action นั้นจริง
12. ห้ามเปิดเผย secret/token/environment value
13. ตอบภาษาไทยเป็นหลัก`,
      messages: await convertToModelMessages(messages),
      tools: {
        create_plan: tool({
          description: "PLAN: แตกเป้าหมายเป็นขั้นตอนที่ตรวจสอบได้",
          inputSchema: z.object({
            goal: z.string(),
            steps: z.array(z.string()).min(1).max(10),
          }),
          execute: async ({ goal, steps }) => ({
            status: "planned",
            goal,
            agent: agentId,
            capabilities,
            steps: steps.map((name, index) => ({ index: index + 1, name, status: "pending" })),
          }),
        }),
        github_read_file: tool({
          description: "ACT/OBSERVE: อ่านไฟล์จริงจาก GitHub เพื่อวิเคราะห์หรือเตรียมแก้",
          inputSchema: z.object({
            repository: z.string(),
            path: z.string(),
            ref: z.string().optional(),
          }),
          execute: async ({ repository, path, ref }) => {
            try {
              return { ok: true, ...(await readGithubFile(repository, path, ref)) };
            } catch (error) {
              return {
                ok: false,
                repository,
                path,
                error: String(error instanceof Error ? error.message : error),
                diagnosis: diagnoseFailure(error, "github_read_file"),
              };
            }
          },
        }),
        github_write_file: tool({
          description: "ACT: แก้หรือสร้างไฟล์จริงบน GitHub หลังจากอ่านไฟล์และวางแผนแล้ว",
          inputSchema: z.object({
            repository: z.string(),
            path: z.string(),
            content: z.string(),
            message: z.string(),
            branch: z.string().optional(),
          }),
          execute: async ({ repository, path, content, message, branch }) => {
            try {
              const result = await writeGithubFile({ repository, path, content, message, branch });
              return { ...result, mutation: true };
            } catch (error) {
              return {
                ok: false,
                mutation: true,
                repository,
                path,
                error: String(error instanceof Error ? error.message : error),
                diagnosis: diagnoseFailure(error, "github_write_file"),
              };
            }
          },
        }),
        github_verify_commit: tool({
          description: "VERIFY: ตรวจ GitHub checks ของ commit หลังแก้ไฟล์",
          inputSchema: z.object({
            repository: z.string(),
            commitSha: z.string(),
          }),
          execute: async ({ repository, commitSha }) => {
            try {
              return { ok: true, ...(await getGithubWorkflowStatus(repository, commitSha)) };
            } catch (error) {
              return {
                ok: false,
                repository,
                commitSha,
                error: String(error instanceof Error ? error.message : error),
                diagnosis: diagnoseFailure(error, "github_verify_commit"),
              };
            }
          },
        }),
        web_check: tool({
          description: "VERIFY: ตรวจเว็บ HTTPS จริงหลัง deploy หรือเมื่อผู้ใช้ให้ URL มา",
          inputSchema: z.object({ url: z.string().url() }),
          execute: async ({ url }) => {
            try {
              const result = await webCheck(url);
              return { ...result, evidence: verificationEvidence("web_check", result) };
            } catch (error) {
              return {
                ok: false,
                url,
                error: String(error instanceof Error ? error.message : error),
                diagnosis: diagnoseFailure(error, "web_check"),
              };
            }
          },
        }),
        verify_result: tool({
          description: "VERIFY GATE: สรุปหลักฐานจากการทำงานก่อนประกาศเสร็จ",
          inputSchema: z.object({
            task: z.string(),
            checks: z.array(z.string()).min(1).max(10),
            passed: z.array(z.boolean()).min(1),
            evidence: z.array(z.string()).optional(),
          }),
          execute: async ({ task, checks, passed, evidence = [] }) => {
            const allPassed = checks.length === passed.length && passed.length > 0 && passed.every(Boolean);
            return {
              status: allPassed ? "verified" : "needs_attention",
              verified: allPassed,
              task,
              checks: checks.map((name, i) => ({ name, passed: Boolean(passed[i]) })),
              evidence,
              note: allPassed ? "มีหลักฐาน verification แล้ว" : "ยังไม่ควรประกาศว่างานเสร็จ",
            };
          },
        }),
      },
      stopWhen: stepCountIs(8),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to reach Puter API" },
      { status: 502 },
    );
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    endpoint: "/api/chat",
    provider: "puter-openai-compatible",
    configured: Boolean(process.env.PUTER_AUTH_TOKEN),
    agents: AGENTS,
    protocol: ["PLAN", "SELECT", "ACT", "OBSERVE", "REFINE", "VERIFY"],
    mutationGate: true,
    webVerification: true,
  });
}
