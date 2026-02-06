"use client";

import { useState, useCallback, useMemo } from "react";
import { Sender } from "@/components/Sender/Sender";
import { MessageList } from "@/components/MessageList/MessageList";
import type { MessagePart } from "@/components/ComposedMarkdown/ComposedMarkdown";
import { useStreamMessages } from "@/components/ComposedMarkdown/hooks/useStreamMessages";
import { streamChunks } from "@/components/ComposedMarkdown/data/streamChunks";

// ==================== 消息项类型定义 ====================

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content?: string;
  parts?: MessagePart[];
  timestamp?: Date;
}

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);

  // 流式消息状态
  const {
    messages: streamingParts,
    isStreaming,
    startStream,
    reset: resetStream,
    pendingInteraction,
    confirmForm,
    updateTaskList,
  } = useStreamMessages({ chunks: streamChunks });

  // 将流式 parts 转换为 MessageItem
  const streamingMessages: MessageItem[] = useMemo(() => {
    if (streamingParts.length === 0) return [];

    return [
      {
        id: "streaming-msg",
        role: "assistant",
        parts: streamingParts,
      },
    ];
  }, [streamingParts]);

  // 合并所有消息（普通消息 + 流式消息）
  const allMessages: MessageItem[] = useMemo(() => {
    return [...messages, ...streamingMessages];
  }, [messages, streamingMessages]);

  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    // 添加用户消息
    const userMessage: MessageItem = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // 模拟 AI 回复
    setTimeout(() => {
      const aiMessage: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `收到你的消息："${content.trim()}"。这是 AI 的回复示例。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  }, []);

  const handleStartStream = useCallback(() => {
    resetStream();
    startStream();
  }, [startStream, resetStream]);

  return (
    <div className="w-full h-screen flex flex-col">
      {/* 流式演示控制栏 */}
      <div className="border-b border-[#E1E0E7] h-[52px] shrink-0 px-4 flex items-center gap-4 bg-[#F9F9FB]">
        <span className="text-sm text-[#787A80]">流式演示：</span>
        <button
          onClick={handleStartStream}
          disabled={isStreaming}
          className="px-3 py-1.5 bg-[#4B6FED] text-white text-sm rounded hover:bg-[#3D5BD9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isStreaming ? "流式输出中..." : "开始流式演示"}
        </button>
        <button
          onClick={() => {
            resetStream();
            setMessages([]);
          }}
          className="px-3 py-1.5 bg-white border border-[#E1E0E7] text-[#403F4D] text-sm rounded hover:bg-gray-50 transition-colors"
        >
          重置
        </button>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col overflow-hidden">
        <div className="flex-1 w-[800px] mx-auto flex flex-col overflow-hidden">
          <MessageList
            messages={allMessages}
            pendingInteraction={pendingInteraction}
            onConfirmForm={confirmForm}
            onUpdateTaskList={updateTaskList}
          />
          <div className="pb-6 shrink-0">
            <Sender onSend={handleSendMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}
