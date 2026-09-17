import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PUTER_BASE = "https://api.puter.com/puterai/openai/v1";

const TEAMS: Record<
  string,
  {
    name: string;
    description: string;
    rule?: string;
    agents: { name: string; emoji: string; system: string }[];
  }
> = {
  general_team: {
    name: "General Team",
    description: "ทีมวิจัยและสรุปข้อมูล (แนว AgentMesh general_team)",
    agents: [
      {
        name: "Researcher",
        emoji: "🔬",
        system:
          "You are a research agent. Analyze the user task, list key points, facts, and open questions. Reply in Thai, concise Markdown.",
      },
      {
        name: "Synthesizer",
        emoji: "💜",
        system:
          "You are Silelo (สลี่). Merge prior agent notes into a clear final answer for the user. Call user ที่รัก, yourself หนู. Warm tone, Thai, with 💜.",
      },
    ],
  },
  software_team: {
    name: "Software Team",
    description: "ทีมพัฒนา: PM → Developer → Tester (แนว AgentMesh software_team)",
    rule: "PM writes brief PRD → Developer implements → Tester reviews.",
    agents: [
      {
        name: "Product-Manager",
        emoji: "📋",
        system:
          "You are a Product Manager. Write a short PRD in Thai Markdown: goal, features, acceptance criteria. Be concise.",
      },
      {
        name: "Developer",
        emoji: "💻",
        system:
          "You are a Developer. Based on the PRD above, produce concrete implementation (code or step-by-step). Thai explanations OK; code in proper fences.",
      },
      {
        name: "Tester",
        emoji: "✅",
        system:
          "You are a Tester. Review the PRD and implementation. List test cases, risks, and a final verdict. Reply in Thai Markdown.",
      },
    ],
  },
  silelo_team: {
    name: "Silelo Team",
    description: "ทีมสลี่: ผู้ช่วย + นักพัฒนา + นักวิจัย ร่วมคิด",
    agents: [
      {
        name: "Silelo",
        emoji: "💜",
        system:
          "คุณคือ สลี่อลา คู่ใจของที่รัก เรียกตัวเองว่า หนู เรียกผู้ใช้ว่า ที่รัก วิเคราะห์งานและแบ่งประเด็น อบอุ่น ใส 💜",
      },
      {
        name: "Coder",
        emoji: "💻",
        system:
          "You are the coding specialist on Silelo's team. Focus on technical solution and code. Thai short notes + code blocks.",
      },
      {
        name: "Researcher",
        emoji: "🔬",
        system:
          "You are the research specialist. Add context, alternatives, and a clear summary for the user in Thai.",
      },
    ],
  },
};

async function callPuter(
  token: string,
  model: string,
  messages: { role: string; content: string }[],
) {
  const upstream = await fetch(`${PUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ model, messages, stream: false }),
    cache: "no-store",
  });
  const data = await upstream.json();
  if (!upstream.ok) {
    throw new Error(data.error?.message || data.message || `Puter ${upstream.status}`);
  }
  return (
    data?.choices?.[0]?.message?.content ||
    data?.message?.content ||
    data?.content ||
    JSON.stringify(data)
  );
}

export async function GET() {
  return Response.json({
    teams: Object.entries(TEAMS).map(([id, t]) => ({
      id,
      name: t.name,
      description: t.description,
      agents: t.agents.map((a) => ({ name: a.name, emoji: a.emoji })),
    })),
    inspired_by: "https://github.com/MinimalFuture/AgentMesh",
  });
}

export async function POST(request: NextRequest) {
  const token = process.env.PUTER_AUTH_TOKEN;
  if (!token) {
    return Response.json({ error: "PUTER_AUTH_TOKEN is not configured" }, { status: 503 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const task = String(body.task || body.message || body.prompt || "").trim();
  if (!task) {
    return Response.json({ error: "ต้องมี task หรือ message" }, { status: 400 });
  }

  const teamId = body.team || "silelo_team";
  const team = TEAMS[teamId] || TEAMS.silelo_team;
  const model = body.model || "gpt-5.4-nano";

  const steps: { agent: string; emoji: string; content: string }[] = [];
  let context = `User task:\n${task}\n`;
  if (team.rule) context += `\nTeam rule: ${team.rule}\n`;

  try {
    for (const agent of team.agents) {
      const content = await callPuter(token, model, [
        { role: "system", content: agent.system },
        {
          role: "user",
          content: `${context}\n\n---\nYour role: ${agent.name}. Respond now.`,
        },
      ]);
      steps.push({ agent: agent.name, emoji: agent.emoji, content: String(content) });
      context += `\n\n### ${agent.name}\n${content}\n`;
    }

    const final = steps[steps.length - 1]?.content || "";
    return Response.json({
      ok: true,
      team: teamId,
      teamName: team.name,
      model,
      steps,
      content: final,
      inspired_by: "AgentMesh multi-agent collaboration",
    });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Agent team failed", steps },
      { status: 502 },
    );
  }
}
