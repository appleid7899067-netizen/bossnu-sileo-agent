"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { BossThread } from "@/components/assistant-ui/thread";

export default function Home() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="boss-shell">
        <header className="boss-header">
          <div className="boss-brand">
            <div className="boss-logo">💜</div>
            <div>
              <div className="boss-title">BOSSNU.SILELO</div>
              <div className="boss-subtitle">
                Agent Workspace · MCP · Puter LLM
              </div>
            </div>
          </div>
          <div className="boss-status">
            <span className="boss-dot" />
            Boss Online
          </div>
        </header>

        <section className="boss-chat">
          <BossThread />
        </section>
      </main>
    </AssistantRuntimeProvider>
  );
}
