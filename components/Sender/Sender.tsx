"use client";

import { useState } from "react";
import { ComposedSender } from "@/components/wuhan/composed/sender";

interface SenderProps {
  onSend?: (content: string) => void;
}

export function Sender({ onSend }: SenderProps) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    if (value.trim()) {
      onSend?.(value);
      setValue("");
    }
  };

  return (
    <ComposedSender
      value={value}
      onChange={setValue}
      onSend={handleSend}
      placeholder="输入你的需求..."
    />
  );
}
