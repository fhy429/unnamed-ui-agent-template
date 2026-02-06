/**
 * AISDK 流式消息处理 Hook
 *
 * 特性：
 * - 多个 chunks 合并到同一个 part（增量更新）
 * - thinking part 支持步骤合并
 * - ID 和原来保持一致（p1, p2, p3, p4, p5...）
 * - 支持用户交互（表单、任务列表）暂停和恢复
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { OpenAIStreamChunk } from "@/types/openai-stream";
import type { MessagePart } from "@/components/ComposedMarkdown/ComposedMarkdown";

// ==================== 工具函数 ====================

function safeJsonParse<T>(jsonStr: string): T | null {
  try {
    // 方案1: 直接解析
    return JSON.parse(jsonStr) as T;
  } catch {
    // 尝试方案2: 处理全角引号 (U+201C, U+201D)
    if (jsonStr.includes("\u201C") || jsonStr.includes("\u201D")) {
      const fixedStr = jsonStr
        .replace(/\u201C/g, '"')
        .replace(/\u201D/g, '"');
      try {
        return JSON.parse(fixedStr) as T;
      } catch {
        // continue
      }
    }

    try {
      // 方案3: 处理无效的转义序列 \{ -> "
      const fixedStr = jsonStr.replace(/\\"/g, '"');
      return JSON.parse(fixedStr) as T;
    } catch {
      // 尝试方案4
    }

    try {
      // 方案4: 双重反转义
      const doubleFixed = jsonStr.replace(/\\\\"/g, '\\"');
      return JSON.parse(doubleFixed) as T;
    } catch {
      // 所有方案都失败了
    }

    console.error("[AISDK] JSON parse failed after all attempts");
    console.error("[AISDK] Original string (first 200 chars):", jsonStr.substring(0, 200));
    return null;
  }
}

// ==================== 思考过程类型定义 ====================

interface ThinkingStepItem {
  content?: string;
  toolCall?: { title?: string; content?: string };
  files?: Array<{ icon?: string; name: string }>;
  taskList?: TaskListData;
}

interface ThinkingStep {
  status: "idle" | "running" | "success" | "error" | "cancelled";
  title: string;
  items?: ThinkingStepItem[];
}

interface TaskListData {
  taskListId: string;
  title?: string;
  tasks: Array<{ id: string; content: string; order: number }>;
}

interface ThinkingArgs {
  thinkingId: string;
  title: string;
  status: "pending" | "thinking" | "completed" | "cancelled";
  duration?: number;
  steps?: ThinkingStep[];
  taskList?: TaskListData;
}

// ==================== 待交互状态 ====================

export interface AisdkPendingInteraction {
  type: "form" | "tasklist";
  id: string;
}

// ==================== Hook 返回值 ====================

interface UseAisdkStreamReturn {
  /** 当前累积的所有 parts */
  parts: MessagePart[];
  /** 是否正在流式输出 */
  isStreaming: boolean;
  /** 当前待用户交互的状态 */
  pendingInteraction: AisdkPendingInteraction | null;
  /** 开始流式处理 chunks */
  startStream: (chunks: OpenAIStreamChunk[]) => void;
  /** 重置所有状态 */
  reset: () => void;
  /** 确认表单提交 */
  confirmForm: (formData: Record<string, unknown>) => void;
  /** 更新任务列表 */
  updateTaskList: (tasks: Array<{ id: string; content: string; completed?: boolean }>) => void;
}

// ==================== 累积的工具调用状态 ====================

interface AccumulatedToolCall {
  index: number;
  id?: string;
  type?: string;
  name?: string;
  arguments?: string;
  complete: boolean;
}

// ==================== 转换器类 ====================

class AisdkStreamTransformer {
  // 已渲染的 parts（按 ID 存储）
  private renderedParts: Map<string, MessagePart>;

  // 累积的工具调用
  private accumulatedToolCalls: Map<number, AccumulatedToolCall>;

  // 当前消息的 part 计数器（用于生成新 ID）
  private currentPartIndex: number = 1;

  // 处理状态
  private isProcessing: boolean = false;
  private pendingInteraction: AisdkPendingInteraction | null = null; // 当前待交互状态
  private chunkQueue: OpenAIStreamChunk[] = [];
  private currentChunkIndex: number = 0;

  // 回调
  private onUpdate?: (parts: MessagePart[]) => void;
  private onInteraction?: (interaction: AisdkPendingInteraction) => void;
  private onComplete?: () => void;

  constructor() {
    this.renderedParts = new Map();
    this.accumulatedToolCalls = new Map();
  }

  // 设置回调
  setCallbacks(
    onUpdate?: (parts: MessagePart[]) => void,
    onInteraction?: (interaction: AisdkPendingInteraction) => void,
    onComplete?: () => void
  ): void {
    this.onUpdate = onUpdate;
    this.onInteraction = onInteraction;
    this.onComplete = onComplete;
  }

  // 重置
  reset(): void {
    this.renderedParts.clear();
    this.accumulatedToolCalls.clear();
    this.chunkQueue = [];
    this.currentChunkIndex = 0;
    this.isProcessing = false;
    this.currentPartIndex = 1; // 重置 part 计数器
  }

  // 开始流式处理
  startStream(chunks: OpenAIStreamChunk[]): void {
    this.reset();
    this.chunkQueue = chunks;
    this.isProcessing = true;
    this.processNextChunk();
  }

  // 处理下一个 chunk
  private async processNextChunk(): Promise<void> {
    if (!this.isProcessing) return;

    if (this.currentChunkIndex >= this.chunkQueue.length) {
      this.isProcessing = false;
      this.onComplete?.();
      return;
    }

    const chunk = this.chunkQueue[this.currentChunkIndex];
    this.currentChunkIndex++;

    // 模拟流式延迟
    await new Promise((resolve) => setTimeout(resolve, 50));

    this.transform(chunk);
    this.processNextChunk();
  }

  // 转换单个 chunk
  private transform(chunk: OpenAIStreamChunk): void {
    const delta = chunk.choices[0]?.delta;
    const finishReason = chunk.choices[0]?.finish_reason;

    console.log("[AISDK] transform chunk:", {
      hasDelta: !!delta,
      hasContent: !!delta?.content,
      hasToolCalls: (delta?.tool_calls?.length ?? 0) > 0,
      finishReason,
      toolCallsCount: delta?.tool_calls?.length ?? 0
    });

    // 检查是否有 finish_reason，如果有则处理累积的工具调用
    if (finishReason !== null && finishReason !== undefined) {
      console.log("[AISDK] finishReason detected:", finishReason, "accumulatedToolCalls:", this.accumulatedToolCalls.size);
      // 处理所有累积的工具调用
      for (const [index, accToolCall] of this.accumulatedToolCalls) {
        console.log("[AISDK] Processing accumulated tool call:", { index, name: accToolCall.name, hasArguments: !!accToolCall.arguments });
        if (accToolCall.name && accToolCall.arguments) {
          this.processToolCall(accToolCall);
        }
      }
      this.accumulatedToolCalls.clear();

      // 如果是 stop，递增 part 计数器，让下一条消息使用新的 ID
      if (finishReason === "stop") {
        this.currentPartIndex += 4; // 每条消息大约 4 个 parts
        console.log("[AISDK] Message complete, incrementing part index to:", this.currentPartIndex);
      }
    }

    if (!delta) return;

    // 处理角色
    if (delta.role) {
      // 角色只在第一条消息时设置
    }

    // 处理文本增量
    if (delta.content) {
      this.updateTextPart(delta.content);
    }

    // 处理工具调用（累积）
    if (delta.tool_calls && delta.tool_calls.length > 0) {
      console.log("[AISDK] Processing tool calls:", delta.tool_calls.map(tc => ({ index: tc.index, hasId: !!tc.id, hasName: !!tc.function?.name, hasArguments: !!tc.function?.arguments })));
      for (const toolCall of delta.tool_calls) {
        const index = toolCall.index;

        // 获取或创建累积的工具调用
        let accToolCall = this.accumulatedToolCalls.get(index);
        if (!accToolCall) {
          accToolCall = {
            index,
            complete: false,
          };
          this.accumulatedToolCalls.set(index, accToolCall);
        }

        // 累积字段
        if (toolCall.id !== undefined) accToolCall.id = toolCall.id;
        if (toolCall.type !== undefined) accToolCall.type = toolCall.type;
        if (toolCall.function?.name !== undefined) accToolCall.name = toolCall.function.name;
        if (toolCall.function?.arguments !== undefined) accToolCall.arguments = (accToolCall.arguments || "") + (toolCall.function.arguments || "");
      }
    }
  }

  // 处理完成的工具调用
  private processToolCall(toolCall: AccumulatedToolCall): void {
    const { name, arguments: argumentsStr, id } = toolCall;

    console.log("[AISDK] processToolCall:", { name, id, argumentsLength: argumentsStr?.length });

    if (!name || !argumentsStr) {
      console.log("[AISDK] processToolCall skipped: missing name or arguments");
      return;
    }

    // 根据函数名处理
    if (name.startsWith("render_form")) {
      this.handleFormRender(id || `form-${toolCall.index}`, argumentsStr);
    } else if (name.startsWith("render_thinking")) {
      this.handleThinkingRender(id || `thinking-${toolCall.index}`, argumentsStr);
    } else if (name.startsWith("render_execution_result")) {
      this.handleExecutionResultRender(id || `exec-${toolCall.index}`, argumentsStr);
    }
  }

  // 更新文本 part
  private updateTextPart(newContent: string): void {
    console.log("[AISDK] updateTextPart:", { newContent: newContent.substring(0, 50) });

    // 查找或创建 text part
    const textPartId = `p${this.currentPartIndex}`;
    let textPart = this.renderedParts.get(textPartId) as MessagePart & { type: "text" };

    if (!textPart) {
      console.log("[AISDK] Creating new text part", textPartId);
      textPart = {
        id: textPartId,
        type: "text",
        text: newContent,
      } as MessagePart & { type: "text" };
    } else {
      console.log("[AISDK] Appending to existing text part", textPartId, "current length:", textPart.text.length);
      textPart.text += newContent;
    }

    this.renderedParts.set(textPartId, textPart);
    this.notifyUpdate();
  }

  // 处理表单渲染
  private handleFormRender(partId: string, argumentsStr: string): void {
    console.log("[AISDK] handleFormRender:", { partId, argumentsStr: argumentsStr.substring(0, 100) });

    const parsedArgs = safeJsonParse<{
      formId: string;
      title?: string;
      fields: Array<{
        name: string;
        label: string;
        type: string;
        required?: boolean;
        placeholder?: string;
        options?: Array<{ value: string; label: string }>;
        description?: string;
        defaultValue?: unknown;
        disabled?: boolean;
      }>;
    }>(argumentsStr);

    if (!parsedArgs) {
      console.error("[AISDK] Failed to parse form arguments:", argumentsStr);
      return;
    }

    const formPart: MessagePart = {
      id: partId,
      type: "form",
      formId: parsedArgs.formId,
      schema: {
        title: parsedArgs.title || "表单",
        fields: parsedArgs.fields.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.type as "input" | "textarea" | "select" | "switch" | "slider" | "date" | "number",
          required: field.required,
          placeholder: field.placeholder,
          options: field.options?.map((opt) => ({ value: opt.value, label: opt.label })),
          description: field.description,
          defaultValue: field.defaultValue,
          disabled: field.disabled,
        })),
      },
    } as MessagePart;

    // 更新或添加表单 part
    this.renderedParts.set(partId, formPart);
    this.notifyUpdate();

    // 设置待交互状态
    console.log("[AISDK] Setting pending interaction for form:", parsedArgs.formId);
    this.setPendingInteraction({ type: "form", id: parsedArgs.formId });
  }

  // 处理思考过程渲染
  private handleThinkingRender(partId: string, argumentsStr: string): void {
    const parsedArgs = safeJsonParse<ThinkingArgs>(argumentsStr);

    if (!parsedArgs) {
      console.error("[AISDK] Failed to parse thinking arguments:", argumentsStr);
      return;
    }

    // 查找 steps 中是否有包含 taskList 的 item
    const findTaskListInSteps = (steps?: ThinkingStep[]): TaskListData | null => {
      if (!steps) return null;
      for (const step of steps) {
        if (step.items) {
          for (const item of step.items) {
            if (item.taskList) {
              return item.taskList;
            }
          }
        }
      }
      return null;
    };

    // 使用 thinkingId 作为唯一 key，实现多个 chunks 合并到同一个 thinking
    const thinkingKey = parsedArgs.thinkingId;

    // 检查是否已存在该 thinking
    const existingPart = Array.from(this.renderedParts.values())
      .find(p => p.type === "thinking" && (p as MessagePart & { thinkingId: string }).thinkingId === thinkingKey) as (MessagePart & { type: "thinking"; thinkingId: string }) | undefined;

    // 查找新的 taskList
    const newTaskList = findTaskListInSteps(parsedArgs.steps);

    if (existingPart) {
      // 合并策略：将新步骤合并到已有的 steps 中
      const existingSteps = existingPart.steps || [];
      const newSteps = parsedArgs.steps || [];

      // 合并 steps：已有的步骤保留，新步骤追加
      const mergedSteps = this.mergeThinkingSteps(existingSteps, newSteps);

      // 更新 existingPart
      existingPart.steps = mergedSteps;
      existingPart.status = parsedArgs.status;
      existingPart.title = parsedArgs.title;
      existingPart.duration = parsedArgs.duration;

      // 如果有 taskList（并且还没有设置过 pending），设置待交互状态
      if (newTaskList && !this.pendingInteraction) {
        console.log("[AISDK] Setting pending interaction for taskList:", newTaskList.taskListId);
        this.setPendingInteraction({ type: "tasklist", id: newTaskList.taskListId });
      }

      this.notifyUpdate();
    } else {
      // 新的 thinking，创建新 part
      const thinkingPart = {
        id: partId,
        type: "thinking" as const,
        thinkingId: thinkingKey,
        title: parsedArgs.title,
        status: parsedArgs.status,
        duration: parsedArgs.duration,
        steps: parsedArgs.steps || [],
      };

      this.renderedParts.set(thinkingKey, thinkingPart as MessagePart);

      // 如果有 taskList（并且还没有设置过 pending），设置待交互状态
      if (newTaskList && !this.pendingInteraction) {
        console.log("[AISDK] Setting pending interaction for new taskList:", newTaskList.taskListId);
        this.setPendingInteraction({ type: "tasklist", id: newTaskList.taskListId });
      }

      this.notifyUpdate();
    }
  }

  // 合并 thinking steps：完全替换已存在的步骤，新增步骤追加
  private mergeThinkingSteps(
    existingSteps: ThinkingStep[],
    newSteps: ThinkingStep[]
  ): ThinkingStep[] {
    const merged = [...existingSteps];

    for (const newStep of newSteps) {
      // 查找是否已存在相同标题的步骤
      const existingIndex = merged.findIndex(s => s.title === newStep.title);

      if (existingIndex >= 0) {
        // 完全替换已有步骤（使用新的 items，状态）
        merged[existingIndex] = {
          ...merged[existingIndex],
          status: newStep.status, // 更新状态
          items: newStep.items || [] // 替换 items，而不是追加
        };
      } else {
        // 新步骤追加到末尾
        merged.push(newStep);
      }
    }

    return merged;
  }

  // 处理执行结果渲染
  private handleExecutionResultRender(partId: string, argumentsStr: string): void {
    const parsedArgs = safeJsonParse<{
      execId: string;
      title?: string;
      items: Array<{
        key?: string;
        status: "success" | "error" | "loading" | "idle";
        title?: string;
        toolName?: string;
        sections?: Array<{ title?: string; content?: string }>;
      }>;
    }>(argumentsStr);

    if (!parsedArgs) return;

    const execPart: MessagePart = {
      id: partId,
      type: "execution-result",
      execId: parsedArgs.execId,
      title: parsedArgs.title || "工具调用结果",
      items: parsedArgs.items.map((item) => ({
        key: item.key,
        status: item.status,
        title: item.title,
        toolName: item.toolName,
        sections: item.sections,
      })),
    } as MessagePart;

    // 更新或添加执行结果 part
    this.renderedParts.set(partId, execPart);
    this.notifyUpdate();
  }

  // 设置待交互状态
  private setPendingInteraction(interaction: AisdkPendingInteraction): void {
    this.isProcessing = false;
    this.pendingInteraction = interaction;
    this.onInteraction?.(interaction);
  }

  // 继续处理
  continue(): void {
    if (this.chunkQueue.length > 0) {
      this.isProcessing = true;
      this.processNextChunk();
    }
  }

  // 确认表单
  confirmForm(formData: Record<string, unknown>): void {
    // 清除 pendingInteraction 状态
    this.pendingInteraction = null;

    // 查找表单 part
    const formPart = Array.from(this.renderedParts.values()).find(
      (p) => p.type === "form"
    ) as (MessagePart & { type: "form"; schema: { fields: Array<{ name: string; defaultValue?: unknown }> } }) | undefined;

    if (formPart) {
      // 更新表单的默认值
      const updatedForm = {
        ...formPart,
        schema: {
          ...formPart.schema,
          fields: formPart.schema.fields.map((field) => ({
            ...field,
            defaultValue: field.name in formData ? formData[field.name] : field.defaultValue,
          })),
        },
      };
      this.renderedParts.set(formPart.id, updatedForm);
      this.notifyUpdate();
    }

    this.continue();
  }

  // 更新任务列表
  updateTaskList(tasks: Array<{ id: string; content: string; completed?: boolean }>): void {
    // 查找 thinking part（taskList 在 thinking 里面）
    const thinkingPart = Array.from(this.renderedParts.values()).find(
      (p) => p.type === "thinking"
    ) as (MessagePart & {
      type: "thinking";
      id: string;
      taskList?: {
        taskListId: string;
        title?: string;
        tasks: Array<{ id?: string; content: string; order?: number }>;
      };
    }) | undefined;

    if (thinkingPart?.taskList) {
      // 更新 taskList
      const updatedThinking: MessagePart = {
        ...thinkingPart,
        taskList: {
          taskListId: thinkingPart.taskList.taskListId,
          title: thinkingPart.taskList.title,
          tasks: tasks.map((task, index) => ({
            id: task.id || String(index + 1),
            content: task.content,
            order: index + 1,
          })),
        },
      } as MessagePart;

      this.renderedParts.set(thinkingPart.id, updatedThinking);
      this.notifyUpdate();
    }

    this.continue();
  }

  // 通知更新
  private notifyUpdate(): void {
    // Map 会保持插入顺序，不需要额外排序
    const sortedParts = Array.from(this.renderedParts.values());

    console.log("[AISDK] notifyUpdate:", {
      partCount: sortedParts.length,
      partIds: sortedParts.map(p => p.id + "|" + p.type)
    });

    this.onUpdate?.(sortedParts);
  }

  // 获取当前 parts（保持插入顺序）
  getParts(): MessagePart[] {
    return Array.from(this.renderedParts.values());
  }
}

// ==================== Hook 实现 ====================

export function useAisdkStream(): UseAisdkStreamReturn {
  const transformerRef = useRef<AisdkStreamTransformer | null>(null);
  const [parts, setParts] = useState<MessagePart[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingInteraction, setPendingInteraction] = useState<AisdkPendingInteraction | null>(null);

  // 初始化转换器
  useEffect(() => {
    if (transformerRef.current == null) {
      transformerRef.current = new AisdkStreamTransformer();
      transformerRef.current.setCallbacks(
        (newParts) => {
          console.log("[AISDK] onUpdate:", newParts.length, "parts");
          setParts(newParts);
        },
        (interaction) => {
          console.log("[AISDK] onInteraction:", interaction);
          setPendingInteraction(interaction);
          setIsStreaming(false);
        },
        () => {
          console.log("[AISDK] onComplete");
          setIsStreaming(false);
        }
      );
    }
  }, []);

  // 开始流式
  const startStream = useCallback((chunks: OpenAIStreamChunk[]) => {
    console.log("[AISDK] startStream:", chunks.length, "chunks");
    setPendingInteraction(null);
    setIsStreaming(true);
    transformerRef.current?.reset();
    transformerRef.current?.startStream(chunks);
  }, []);

  // 重置
  const reset = useCallback(() => {
    console.log("[AISDK] reset");
    setParts([]);
    setIsStreaming(false);
    setPendingInteraction(null);
    transformerRef.current?.reset();
  }, []);

  // 确认表单
  const confirmForm = useCallback((formData: Record<string, unknown>) => {
    console.log("[AISDK] confirmForm:", formData);
    transformerRef.current?.confirmForm(formData);
    setPendingInteraction(null);
    setIsStreaming(true);
  }, []);

  // 更新任务列表
  const updateTaskList = useCallback((tasks: Array<{ id: string; content: string; completed?: boolean }>) => {
    console.log("[AISDK] updateTaskList:", tasks);
    transformerRef.current?.updateTaskList(tasks);
    setPendingInteraction(null);
    setIsStreaming(true);
  }, []);

  return {
    parts,
    isStreaming,
    pendingInteraction,
    startStream,
    reset,
    confirmForm,
    updateTaskList,
  };
}

// ==================== 便捷函数 ====================

export function createAisdkTransformer(): AisdkStreamTransformer {
  return new AisdkStreamTransformer();
}
