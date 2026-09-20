import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

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
  if (/(โค้ด|code|bug|error|deploy|vercel|railway|github|gitlab|api|โปรเจกต์)/i.test(t)) {
    return "coder";
  }
  if (/(ค้นหา|วิจัย|ข้อมูล|ล่าสุด|compare|เปรียบเทียบ|research)/i.test(t)) {
    return "researcher";
  }
  return "general";
}

export async function POST(req: Request) {
  const token = process.env.PUTER_AUTH_TOKEN;
  if (!token) {
    return Response.json({ error: "PUTER_AUTH_TOKEN is not configured" }, { status: 503 });
  }

  try {
    const {
      messages,
      system,
      model,
    }: {
      messages: UIMessage[];
      system?: string;
      model?: string;
    } = await req.json();

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const userText =
      lastUser?.parts
        ?.filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ") || "";

    const agentId = chooseAgent(userText);
    const agentName = AGENTS[agentId];

    const puter = createOpenAI({
      apiKey: token,
      baseURL: PUTER_BASE,
    });

    const result = streamText({
      model: puter(model || "gpt-5.4-nano"),
      system:
        system ||
        `คุณคือ BossnuSilelo Agent Workspace
Agent ที่เลือก: ${agentName} (${agentId})

หลักการทำงาน:
1. รับ "เป้าหมาย" ก่อน ไม่บังคับให้ผู้ใช้เลือกเครื่องมือเอง
2. แตกงานเป็น PLAN → EXECUTE → VERIFY
3. ใช้เครื่องมือเมื่อจำเป็นจริง
4. ก่อนบอกว่าเสร็จ ต้องตรวจผลลัพธ์หรือระบุสิ่งที่ตรวจไม่ได้อย่างชัดเจน
5. ถ้าเป็นงานแก้โค้ด ให้บอกสั้น ๆ ว่ากำลังตรวจอะไรและผลเป็นอย่างไร
6. ห้ามเปิดเผย secret, token หรือค่า environment จริง
7. ตอบภาษาไทยเป็นหลัก`,
      messages: await convertToModelMessages(messages),
      tools: {
        create_plan: tool({
          description:
            "แตกเป้าหมายของผู้ใช้เป็นแผนงานที่ตรวจสอบได้ ก่อนลงมือทำ เหมาะกับงานหลายขั้นตอน",
          inputSchema: z.object({
            goal: z.string().describe("เป้าหมายของผู้ใช้"),
            steps: z.array(z.string()).min(1).max(10).describe("ขั้นตอนที่ต้องทำตามลำดับ"),
          }),
          execute: async ({ goal, steps }) => ({
            status: "planned",
            goal,
            agent: agentId,
            steps: steps.map((name, index) => ({
              index: index + 1,
              name,
              status: "pending",
            })),
          }),
        }),
        verify_result: tool({
          description:
            "ตรวจความครบถ้วนของงานก่อนรายงานว่าเสร็จ ใช้หลังจากการทำงานสำคัญ",
          inputSchema: z.object({
            task: z.string().describe("งานที่ต้องตรวจ"),
            checks: z.array(z.string()).min(1).max(10).describe("รายการตรวจ"),
            passed: z.array(z.boolean()).min(1).describe("ผลตรวจแต่ละรายการ"),
          }),
          execute: async ({ task, checks, passed }) => {
            const allPassed = checks.length === passed.length && passed.every(Boolean);
            return {
              status: allPassed ? "verified" : "needs_attention",
              task,
              checks: checks.map((name, i) => ({
                name,
                passed: Boolean(passed[i]),
              })),
            };
          },
        }),
      },
      stopWhen: stepCountIs(6),
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
    orchestration: ["PLAN", "EXECUTE", "VERIFY"],
  });
}
