/**
 * OpenAI 流式数据转换器
 * 
 * 将 OpenAI 流式响应 chunk 转换为应用内部格式
 * 支持：文本增量、思考过程、工具调用、表单、任务列表等
 */

import type { OpenAIStreamChunk } from "@/types/openai-stream";
import type { MessagePart } from "@/components/ComposedMarkdown/ComposedMarkdown";

// ==================== 工具函数 ====================

/**
 * 生成唯一 ID
 */
function generateId(prefix: string = "p"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 安全解析 JSON（容错处理）
 */
function safeJsonParse<T>(jsonStr: string): T | null {
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

// ==================== 累积状态 ====================

/**
 * 转换器内部状态
 */
interface TransformState {
  // 累积的文本
  accumulatedText: string;
  // 累积的思考内容
  accumulatedReasoning: string;
  // 累积的思考步骤
  reasoningSteps: Array<{
    status: "idle" | "running" | "success" | "error";
    title: string;
    items?: Array<{
      content: string;
      toolCall?: { icon?: unknown; title?: string; content?: string };
      files?: Array<{ icon?: string; name: string }>;
    }>;
  }>;
  // 工具调用累积（key: toolCallIndex）
  toolCalls: Map<number, {
    id?: string;
    type?: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
  // 附件
  attachments: Array<{
    id: string;
    type: string;
    filename?: string;
  }>;
  // 已输出的 parts（去重用）
  outputParts: Map<string, MessagePart>;
  // 当前消息 ID
  messageId: string;
  // 当前角色
  currentRole: "assistant" | "user" | undefined;
}

// ==================== 转换器类 ====================

/**
 * OpenAI 流式数据转换器
 * 
 * 用法示例：
 * ```typescript
 * const transformer = new OpenAIStreamTransformer();
 * 
 * // 处理每个 chunk
 * for (const chunk of streamChunks) {
 *   const parts = transformer.transform(chunk);
 *   // 使用 parts 更新 UI
 * }
 * 
 * // 获取完整消息
 * const message = transformer.getCompleteMessage();
 * ```
 */
export class OpenAIStreamTransformer {
  private state: TransformState;

  constructor(messageId?: string) {
    this.state = {
      accumulatedText: "",
      accumulatedReasoning: "",
      reasoningSteps: [],
      toolCalls: new Map(),
      attachments: [],
      outputParts: new Map(),
      messageId: messageId || generateId("msg"),
      currentRole: undefined,
    };
  }

  /**
   * 重置转换器状态
   */
  reset(messageId?: string): void {
    this.state = {
      accumulatedText: "",
      accumulatedReasoning: "",
      reasoningSteps: [],
      toolCalls: new Map(),
      attachments: [],
      outputParts: new Map(),
      messageId: messageId || generateId("msg"),
      currentRole: undefined,
    };
  }

  /**
   * 获取当前消息 ID
   */
  getMessageId(): string {
    return this.state.messageId;
  }

  /**
   * 转换单个 OpenAI chunk 为应用格式的 parts
   * 
   * @param chunk - OpenAI 流式响应 chunk
   * @returns 应用格式的 MessagePart 数组
   */
  transform(chunk: OpenAIStreamChunk): MessagePart[] {
    const parts: MessagePart[] = [];
    const delta = chunk.choices[0]?.delta;

    if (!delta) {
      // 检查是否是结束信号
      const finishReason = chunk.choices[0]?.finish_reason;
      if (finishReason && finishReason !== "tool_calls" && finishReason !== "length") {
        // 流式结束，可以在这里做一些清理工作
      }
      return parts;
    }

    // 1. 处理角色定义（通常是第一个 chunk）
    if (delta.role && this.state.currentRole === undefined) {
      this.state.currentRole = delta.role as "assistant" | "user";
    }

    // 2. 处理内容增量（文本）
    if (delta.content) {
      this.state.accumulatedText += delta.content;
      
      const textPart = this.buildTextPart();
      if (textPart) {
        parts.push(textPart);
        this.state.outputParts.set(textPart.id, textPart);
      }
    }

    // 3. 处理思考过程增量
    if (delta.reasoning_content) {
      this.state.accumulatedReasoning += delta.reasoning_content;
      
      // 解析思考内容，提取步骤
      this.parseReasoningContent();
      
      const thinkingPart = this.buildThinkingPart();
      if (thinkingPart) {
        parts.push(thinkingPart);
        this.state.outputParts.set(thinkingPart.id, thinkingPart);
      }
    }

    // 4. 处理工具调用
    if (delta.tool_calls && delta.tool_calls.length > 0) {
      for (const toolCall of delta.tool_calls) {
        const index = toolCall.index;
        const existing = this.state.toolCalls.get(index) || {};
        
        this.state.toolCalls.set(index, {
          ...existing,
          id: toolCall.id ?? existing.id,
          type: toolCall.type ?? existing.type,
          function: {
            name: toolCall.function?.name ?? existing.function?.name,
            arguments: toolCall.function?.arguments ?? existing.function?.arguments,
          },
        });

        // 检查工具调用是否完整
        const fullToolCall = this.state.toolCalls.get(index);
        if (fullToolCall?.function?.name && fullToolCall?.function?.arguments) {
          // 尝试解析参数
          const argsStr = fullToolCall.function.arguments;
          const parsedArgs = safeJsonParse<Record<string, unknown>>(argsStr);
          
          if (parsedArgs && this.isCompleteToolCall(fullToolCall.function.name, parsedArgs)) {
            // 生成对应的 UI part
            const uiPart = this.buildUiPartFromToolCall(
              fullToolCall.id || generateId("tc"),
              fullToolCall.function.name,
              parsedArgs
            );
            
            if (uiPart) {
              parts.push(uiPart);
              this.state.outputParts.set(uiPart.id, uiPart);
            }
          }
        }
      }
    }

    // 5. 处理附件
    if (delta.attachments) {
      for (const attachment of delta.attachments) {
        this.state.attachments.push(attachment);
        // 可以在这里生成附件相关的 part
      }
    }

    return parts;
  }

  /**
   * 获取累积的文本（不含特殊标记）
   */
  getAccumulatedText(): string {
    return this.state.accumulatedText;
  }

  /**
   * 获取累积的思考内容
   */
  getAccumulatedReasoning(): string {
    return this.state.accumulatedReasoning;
  }

  /**
   * 获取当前角色
   */
  getCurrentRole(): "assistant" | "user" | undefined {
    return this.state.currentRole;
  }

  /**
   * 检查工具调用是否完整
   */
  private isCompleteToolCall(functionName: string, args: Record<string, unknown>): boolean {
    switch (functionName) {
      case "render_form":
        return !!(args.formId && args.fields);
      case "render_tasklist":
        return !!(args.taskListId && args.tasks);
      case "render_execution_result":
        return !!(args.execId && args.items);
      default:
        return false;
    }
  }

  /**
   * 解析思考内容，提取步骤信息
   */
  private parseReasoningContent(): void {
    const reasoning = this.state.accumulatedReasoning;
    
    // 检测是否包含步骤信息（通过特定的模式匹配）
    // 例如："已完成 - 步骤1: xxx。步骤2: yyy。"
    if (reasoning.includes("已完成") || reasoning.includes("步骤")) {
      // 简单解析：按句号或特定分隔符拆分
      const steps = reasoning.split(/(?=\u6b65\u9aa4\d|已完成)/);
      
      if (steps.length > 0) {
        this.state.reasoningSteps = steps.map((step, index) => {
          const content = step.trim();
          let title = `步骤 ${index + 1}`;
          
          if (content.includes("已完成")) {
            title = "已完成";
          } else if (content.startsWith("步骤")) {
            const match = content.match(/步骤(\d+)[:：]\s*(.+)/);
            if (match) {
              title = `步骤 ${match[1]}: ${match[2].substring(0, 20)}...`;
            }
          }
          
          return {
            status: content.includes("已完成") ? "success" : "running",
            title,
            items: [{ content }],
          };
        });
      }
    } else {
      // 通用情况：单个思考步骤
      if (this.state.reasoningSteps.length === 0) {
        this.state.reasoningSteps = [{
          status: "running",
          title: "思考中",
          items: [{ content: reasoning }],
        }];
      } else {
        // 更新最后一个步骤的内容
        const lastStep = this.state.reasoningSteps[this.state.reasoningSteps.length - 1];
        if (lastStep.items && lastStep.items.length > 0) {
          lastStep.items[0].content = reasoning;
        }
      }
    }
  }

  /**
   * 构建文本 Part
   */
  private buildTextPart(): MessagePart | null {
    // 移除已经处理过的特殊标记内容
    let text = this.state.accumulatedText;
    
    // 如果累积的文本是空的，返回 null
    if (!text.trim()) {
      return null;
    }

    // 返回文本 part（注意：这里只返回增量，实际渲染时会拼接）
    // 但在我们的架构中，每个 chunk 都会返回一个新的 text part
    // 渲染组件会正确处理这种情况
    return {
      id: generateId("text"),
      type: "text",
      text: text,
    } as MessagePart;
  }

  /**
   * 构建思考过程 Part
   */
  private buildThinkingPart(): MessagePart | null {
    if (!this.state.accumulatedReasoning.trim()) {
      return null;
    }

    // 确定思考状态
    const reasoning = this.state.accumulatedReasoning;
    let status: "pending" | "thinking" | "completed" | "cancelled" = "thinking";
    
    if (reasoning.includes("已完成") || reasoning.includes("完成")) {
      status = "completed";
    }

    return {
      id: generateId("thinking"),
      type: "thinking",
      thinkingId: generateId("thinking"),
      title: status === "completed" ? "思考完成" : "思考中",
      status,
      steps: this.state.reasoningSteps.length > 0 
        ? this.state.reasoningSteps 
        : [{
            status: status === "completed" ? "success" : "running",
            title: status === "completed" ? "已完成" : "推理中",
            items: [{ content: reasoning }],
          }],
    } as MessagePart;
  }

  /**
   * 根据工具调用生成对应的 UI Part
   */
  private buildUiPartFromToolCall(
    toolCallId: string,
    functionName: string,
    args: Record<string, unknown>
  ): MessagePart | null {
    switch (functionName) {
      case "render_form": {
        const formData = args as {
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
        };
        
        return {
          id: generateId("form"),
          type: "form",
          formId: formData.formId,
          schema: {
            title: formData.title || "表单",
            fields: formData.fields.map((field) => ({
              name: field.name,
              label: field.label,
              type: field.type as "input" | "textarea" | "select" | "switch" | "slider" | "date" | "number",
              required: field.required,
              placeholder: field.placeholder,
              options: field.options?.map((opt) => ({
                value: opt.value,
                label: opt.label,
              })),
              description: field.description,
              defaultValue: field.defaultValue,
              disabled: field.disabled,
            })),
          },
        } as MessagePart;
      }

      case "render_tasklist": {
        const taskData = args as {
          taskListId: string;
          title?: string;
          tasks: Array<{
            id?: string;
            content: string;
            order?: number;
          }>;
        };
        
        return {
          id: generateId("tasklist"),
          type: "task-list",
          taskListId: taskData.taskListId,
          title: taskData.title || "待办清单",
          tasks: taskData.tasks.map((task, index) => ({
            id: task.id || String(index + 1),
            content: task.content,
            order: task.order || index + 1,
          })),
        } as MessagePart;
      }

      case "render_execution_result": {
        const execData = args as {
          execId: string;
          title?: string;
          items: Array<{
            key?: string;
            status: "success" | "error" | "loading" | "idle";
            title?: string;
            toolName?: string;
            sections?: Array<{ title?: string; content?: string }>;
          }>;
        };
        
        return {
          id: generateId("exec"),
          type: "execution-result",
          execId: execData.execId,
          title: execData.title || "工具调用结果",
          items: execData.items.map((item) => ({
            key: item.key,
            status: item.status,
            title: item.title,
            toolName: item.toolName,
            sections: item.sections,
          })),
        } as MessagePart;
      }

      default:
        console.warn(`Unknown tool call function: ${functionName}`);
        return null;
    }
  }

  /**
   * 获取完整的应用消息
   */
  getCompleteMessage(): {
    id: string;
    role: "assistant" | "user";
    parts: MessagePart[];
  } {
    return {
      id: this.state.messageId,
      role: this.state.currentRole || "assistant",
      parts: Array.from(this.state.outputParts.values()),
    };
  }

  /**
   * 获取当前累积的所有 parts
   */
  getCurrentParts(): MessagePart[] {
    return Array.from(this.state.outputParts.values());
  }
}

// ==================== 便捷工厂函数 ====================

/**
 * 创建转换器并处理单个 chunk
 */
export function transformStreamChunk(chunk: OpenAIStreamChunk, transformer?: OpenAIStreamTransformer): {
  transformer: OpenAIStreamTransformer;
  parts: MessagePart[];
} {
  if (!transformer) {
    transformer = new OpenAIStreamTransformer();
  }
  
  const parts = transformer.transform(chunk);
  return { transformer, parts };
}

/**
 * 处理完整的流式响应（返回所有累积的 parts）
 */
export function processFullStream(chunks: OpenAIStreamChunk[]): {
  messageId: string;
  role: "assistant" | "user" | undefined;
  parts: MessagePart[];
} {
  const transformer = new OpenAIStreamTransformer();
  
  for (const chunk of chunks) {
    transformer.transform(chunk);
  }
  
  return {
    messageId: transformer.getMessageId(),
    role: transformer.getCurrentRole(),
    parts: transformer.getCurrentParts(),
  };
}

// ==================== 辅助：生成模拟流式数据 ====================

/**
 * 模拟 OpenAI 流式 API 的延迟发送
 * 
 * @param chunks - 要发送的 chunks
 * @param delayMs - 每个 chunk 之间的延迟（毫秒）
 * @param onChunk - 每个 chunk 到达时的回调
 * @returns Promise，完成时返回完整消息
 */
export async function simulateStream(
  chunks: OpenAIStreamChunk[],
  options: {
    delayMs?: number;
    onChunk?: (chunk: OpenAIStreamChunk, index: number) => void;
    onComplete?: () => void;
  } = {}
): Promise<{
  transformer: OpenAIStreamTransformer;
  parts: MessagePart[];
}> {
  const { delayMs = 50, onChunk, onComplete } = options;
  
  const transformer = new OpenAIStreamTransformer();
  const allParts: MessagePart[] = [];

  for (let i = 0; i < chunks.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    
    const chunk = chunks[i];
    if (onChunk) {
      onChunk(chunk, i);
    }
    
    const parts = transformer.transform(chunk);
    allParts.push(...parts);
  }

  onComplete?.();
  
  return {
    transformer,
    parts: allParts,
  };
}





