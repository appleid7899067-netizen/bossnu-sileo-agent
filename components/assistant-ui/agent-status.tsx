"use client";

import { useAuiState } from "@assistant-ui/react";

export function AgentStatus() {
  const isRunning = useAuiState((s) => s.thread.isRunning);

  return (
    <div className="boss-agentbar">
      <span className="boss-agentpill">🧠 Boss Agent</span>
      <span>PLAN → EXECUTE → VERIFY</span>
      {!isRunning && <span className="boss-ready">พร้อม</span>}
    </div>
  );
}
