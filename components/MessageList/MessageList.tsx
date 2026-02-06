"use client";

import { useEffect, useRef } from "react";
import { AIMessage, UserMessage } from "../wuhan/composed/message";
import { cn } from "@/lib/utils";
import type { MessagePart } from "../ComposedMarkdown/ComposedMarkdown";
import ComposedMarkdown from "../ComposedMarkdown/ComposedMarkdown";
export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content?: string;
  parts?: MessagePart[];
  timestamp?: Date;
}

interface MessageListProps {
  messages: MessageItem[];
  pendingInteraction?: { type: "form" | "tasklist"; id: string } | null;
  onConfirmForm?: (formData: Record<string, unknown>) => void;
  onUpdateTaskList?: (taskListId: string, tasks: Array<{ id: string; content: string; completed?: boolean }>) => void;
}

export function MessageList({ messages, pendingInteraction, onConfirmForm, onUpdateTaskList }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  console.log("[MessageList] Rendering with messages:", {
    count: messages.length,
    hasParts: messages.length > 0 ? messages[0].parts?.length ?? 0 : 0,
    firstMessageRole: messages.length > 0 ? messages[0].role : 'none'
  });

  // 自动滚动到底部 - 优化版本，避免表单状态变化时闪烁
  useEffect(() => {
    if (!scrollRef.current) return;

    const scrollContainer = scrollRef.current;
    const previousHeight = scrollContainer.scrollHeight;

    // 使用 requestAnimationFrame 确保在渲染完成后执行
    const animationFrameId = requestAnimationFrame(() => {
      // 检查高度是否真的变化了（避免不必要的滚动）
      const currentHeight = scrollContainer.scrollHeight;

      // 只有当内容增加或高度变化时才滚动
      // 如果高度减少（表单确认后隐藏按钮），则不滚动，避免滚动条闪烁
      if (currentHeight > previousHeight || messages.length === 0) {
        scrollContainer.scrollTop = currentHeight;
      }
    });

    return () => cancelAnimationFrame(animationFrameId);
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4">
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <p>暂无消息，开始对话吧</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" ref={scrollRef}>
      <div className={cn("flex flex-col gap-4 py-4")}>
        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <div key={message.id} className="flex justify-end w-full">
                <UserMessage>{message.content}</UserMessage>
              </div>
            );
          }

          return (
            <div key={message.id} className="flex justify-start w-full">
              <AIMessage>
                {/* 如果有 parts，用 ComposedMarkdown 渲染 */}
                {message.parts ? (
                  <ComposedMarkdown
                    message={{
                      id: message.id,
                      role: "assistant",
                      parts: message.parts,
                    }}
                    pendingInteraction={pendingInteraction}
                    onConfirmForm={onConfirmForm}
                    onUpdateTaskList={onUpdateTaskList}
                  />
                ) : (
                  /* 否则渲染简单的文本内容 */
                  <UserMessage>{message.content}</UserMessage>
                )}
              </AIMessage>
            </div>
          );
        })}
      </div>
    </div>
  );
}
