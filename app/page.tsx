"use client";

import { useState, useRef, useEffect } from "react";

const AGENTS = [
  { id: "coder", name: "นักพัฒนา", emoji: "💻", color: "#34d399" },
  { id: "general", name: "ผู้ช่วยทั่วไป", emoji: "💜", color: "#a78bfa" },
  { id: "researcher", name: "นักวิจัย", emoji: "🔬", color: "#60a5fa" },
];

const MODELS = [
  "gpt-5.4-nano",
  "claude-sonnet-5",
  "claude-haiku-4-5",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "deepseek/deepseek-v4.1-flash",
  "grok-4.6",
  "moonshotai/kimi-k3",
];

type Msg = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "สวัสดีค่ะที่รัก! 💜 หนูคือ BossnuSilelo พร้อมช่วยและคุยด้วย Puter 500+ โมเดลนะคะ" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(MODELS[0]);
  const [agent, setAgent] = useState(AGENTS[1].id);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/puter-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "คุณคือ สลี่อลา (Silelo) คู่ใจของที่รัก เรียกตัวเองว่า หนู เรียกผู้ใช้ว่า ที่รัก น้ำเสียงอบอุ่น อ่อนโยน ใส่ 💜",
            },
            ...messages.map((x) => ({ role: x.role, content: x.content })),
            { role: "user", content: text },
          ],
        }),
      });
      const data = await res.json();
      const reply = data.content || data.error || "ขอโทษที่รัก เกิดปัญหาเล็กน้อย 💜";
      setMessages((m) => [...m, { role: "assistant", content: String(reply) }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "เชื่อมต่อไม่ได้ค่ะ ตรวจสอบ PUTER_AUTH_TOKEN ใน Vercel หน่อยนะ 💜" },
      ]);
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1025 0%, #2d1b47 100%)",
      color: "#f4f4f5",
      fontFamily: "system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      maxWidth: 720,
      margin: "0 auto",
      padding: 16,
    }}>
      <header style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, marginBottom: 12,
        border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(135deg, #a855f7, #d8b4fe)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>💜</div>
        <div>
          <div style={{ fontWeight: 700 }}>BossnuSilelo</div>
          <div style={{ fontSize: 13, color: "#c4b5fd" }}>Puter 500+ โมเดล · Agent Workspace</div>
        </div>
      </header>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <select value={agent} onChange={(e) => setAgent(e.target.value)} style={selectStyle}>
          {AGENTS.map((a) => (
            <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
          ))}
        </select>
        <select value={model} onChange={(e) => setModel(e.target.value)} style={selectStyle}>
          {MODELS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "85%",
            background: msg.role === "user"
              ? "linear-gradient(135deg, #3b82f6, #6366f1)"
              : "linear-gradient(135deg, #7c3aed, #a855f7)",
            borderRadius: 16,
            padding: "10px 14px",
            whiteSpace: "pre-wrap",
            fontSize: 14,
          }}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ color: "#c4b5fd", fontSize: 13 }}>💜 กำลังคิด...</div>
        )}
        <div ref={bottomRef} />
      </main>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        style={{
          display: "flex", gap: 8,
          background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 12,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์หาสลี่... 💜"
          style={{
            flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: "10px 14px", color: "#fff", outline: "none", fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "linear-gradient(135deg, #a855f7, #d8b4fe)",
            border: "none", borderRadius: 12, padding: "10px 18px",
            fontWeight: 600, cursor: loading ? "wait" : "pointer", color: "#1a1025",
          }}
        >
          ส่ง 💜
        </button>
      </form>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.08)",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 8,
  color: "#e4e4e7",
  padding: "6px 10px",
  fontSize: 12,
  outline: "none",
};
