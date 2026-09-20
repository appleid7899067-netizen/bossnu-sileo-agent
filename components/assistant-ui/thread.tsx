"use client";

import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";

export function BossThread() {
  return (
    <ThreadPrimitive.Root className="boss-thread">
      <ThreadPrimitive.Viewport
        className="boss-viewport"
        turnAnchor="top"
        autoScroll={false}
        scrollToBottomOnRunStart
      >
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <div className="boss-empty">
            <div className="boss-avatar">💜</div>
            <h1>BossnuSilelo</h1>
            <p>บอกเป้าหมายมาได้เลย บอสจะหาวิธีทำให้เอง</p>
          </div>
        </AuiIf>

        <ThreadPrimitive.Messages>
          {({ message }) =>
            message.role === "user" ? <UserMessage /> : <AssistantMessage />
          }
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter className="boss-footer">
          <ComposerPrimitive.Root className="boss-composer">
            <ComposerPrimitive.Input
              placeholder="บอกเป้าหมายให้บอส..."
              className="boss-input"
              rows={1}
            />
            <ComposerPrimitive.Send className="boss-send">
              ↑
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
          <div className="boss-hint">
            Assistant UI · Streaming · Puter · Agent Workspace
          </div>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="boss-message boss-user">
      <div className="boss-bubble boss-user-bubble">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="boss-message boss-assistant">
      <div className="boss-bubble boss-assistant-bubble">
        <div className="boss-name">💜 Boss</div>
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}
