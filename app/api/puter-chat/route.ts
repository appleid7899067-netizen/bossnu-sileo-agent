import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUTER_BASE = "https://api.puter.com/puterai/openai/v1";

export async function POST(request: NextRequest) {
  const token = process.env.PUTER_AUTH_TOKEN;
  if (!token) {
    return Response.json(
      { error: "PUTER_AUTH_TOKEN is not configured" },
      { status: 503 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = body.messages || [
    { role: "user", content: body.prompt || body.message || "Hello" },
  ];
  const model = body.model || "gpt-5.4-nano";

  try {
    const upstream = await fetch(`${PUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
      cache: "no-store",
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return Response.json(
        { error: data.error || data.message || "Puter API error", status: upstream.status },
        { status: upstream.status },
      );
    }

    const content =
      data?.choices?.[0]?.message?.content ||
      data?.message?.content ||
      data?.content ||
      JSON.stringify(data);

    return Response.json({
      ok: true,
      model,
      content,
      raw: data,
    });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Failed to reach Puter API" },
      { status: 502 },
    );
  }
}

export async function GET() {
  const token = process.env.PUTER_AUTH_TOKEN;
  return Response.json({
    configured: !!token,
    endpoint: "/api/puter-chat",
    models_hint: ["gpt-5.4-nano", "claude-sonnet-4", "gemini-2.5-flash"],
  });
}
