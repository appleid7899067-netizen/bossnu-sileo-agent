import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PUTER_BASE = "https://api.puter.com/puterai/openai/v1";

export async function POST(req: Request) {
  const token = process.env.PUTER_AUTH_TOKEN;

  if (!token) {
    return Response.json(
      { error: "PUTER_AUTH_TOKEN is not configured" },
      { status: 503 },
    );
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

    const puter = createOpenAI({
      apiKey: token,
      baseURL: PUTER_BASE,
    });

    const result = streamText({
      model: puter(model || "gpt-5.4-nano"),
      system:
        system ||
        "คุณคือ BossnuSilelo ผู้ช่วย AI ใน Agent Workspace ทำงานเป็นระบบ ตอบภาษาไทยเป็นหลัก และเมื่อผู้ใช้บอกเป้าหมายให้ช่วยวางแผนและลงมือทำตามเครื่องมือที่มี",
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reach Puter API",
      },
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
  });
}
