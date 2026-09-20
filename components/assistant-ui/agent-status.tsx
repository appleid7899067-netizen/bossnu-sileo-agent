"use client";

import { useThread } from "@assistant-ui/react";

export function AgentStatus() {
  const thread = useThread();

  return (
    <div className="boss-agentbar">
      <span className="boss-agentpill">🧠 Boss Agent</span>
      <span>PLAN → EXECUTE → VERIFY</span>
      {!thread.isRunning && <span className="boss-ready">พร้อม</span>}
    </div>
  );
}
