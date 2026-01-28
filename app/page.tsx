"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

export default function Page() {
  const [input, setInput] = useState("");

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Chat</h1>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              message.role === "user"
                ? "bg-blue-100 ml-auto max-w-[80%]"
                : "bg-gray-100 mr-auto max-w-[80%]"
            }`}
          >
            <div className="font-semibold mb-1">
              {message.role === "user" ? "You" : "AI"}
            </div>
            {message.parts.map((part) => {
              if (part.type === "text") {
                return (
                  <div
                    key={`${message.id}-text`}
                    className="whitespace-pre-wrap"
                  >
                    {part.text}
                  </div>
                );
              }
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your message..."
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
          }}
          onKeyDown={async (event) => {
            if (event.key === "Enter") {
              sendMessage({
                parts: [{ type: "text", text: input }],
              });
              setInput("");
            }
          }}
        />
        <button
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          onClick={() => {
            if (input.trim()) {
              sendMessage({
                parts: [{ type: "text", text: input }],
              });
              setInput("");
            }
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
