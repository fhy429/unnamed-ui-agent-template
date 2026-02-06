"use client";

import React, { useRef, useState, useEffect } from "react";
import Markdown from "../wuhan/composed/markdown";
import {
  DynamicForm,
  type DynamicFormRef,
  type FormSchema,
} from "../wuhan/composed/dynamic-form";
import {
  TaskList,
  type TodoItem,
} from "../wuhan/composed/task-list";
import { ExecutionResult } from "../wuhan/composed/execution-result";
import { ThinkingStep, type ThinkingStepContentBlock } from "../wuhan/composed/thinking-process";
import type { ThinkingStepItemProps } from "../wuhan/composed/thinking-step-item";

// ==================== TaskList 内部状态组件 ====================

interface TaskListWithStateProps {
  taskList: {
    taskListId: string;
    title?: string;
    tasks: TodoItem[];
  };
  isActive: boolean;
  onConfirm?: (taskListId: string, tasks: TodoItem[]) => void;
}

function TaskListWithState({ taskList, isActive, onConfirm }: TaskListWithStateProps) {
  // 使用 ref 保持对最新 taskList 的引用
  const taskListRef = useRef(taskList);
  // 初始化时设置一次，之后不再在 render 中设置
  useEffect(() => {
    taskListRef.current = taskList;
  }, [taskList]);

  // 使用 state 管理编辑后的 tasks
  const [editedTasks, setEditedTasks] = useState<TodoItem[]>(taskList.tasks);

  // 当源数据变化时，同步 editedTasks
  useEffect(() => {
    setEditedTasks(taskListRef.current.tasks);
  }, []);

  return (
    <TaskList
      dataSource={editedTasks}
      title={taskList.title || "待办清单"}
      status={isActive ? "confirmed" : "pending"}
      editable={!isActive}
      onItemsChange={setEditedTasks}
      onConfirmExecute={() => {
        onConfirm?.(taskListRef.current.taskListId, editedTasks);
      }}
    />
  );
}

// ==================== 消息部分的类型定义 ====================

interface BasePart {
  id: string;
}

interface TextPart extends BasePart {
  type: "text";
  text: string;
}

interface FormPart extends BasePart {
  type: "form";
  formId: string;
  schema: FormSchema;
}

interface TaskListPart extends BasePart {
  type: "task-list";
  taskListId: string;
  title?: string;
  tasks: TodoItem[];
}

interface ExecutionResultPart extends BasePart {
  type: "execution-result";
  execId: string;
  title?: string;
  items: Array<{
    key?: string;
    status: "success" | "error" | "loading" | "idle";
    title?: string;
    toolName?: string;
    sections?: Array<{ title?: string; content?: string }>;
  }>;
}

interface ThinkingPart extends BasePart {
  type: "thinking";
  thinkingId: string;
  title: string;
  status: "pending" | "thinking" | "completed" | "cancelled";
  duration?: number;
  steps?: Array<{
    status: "idle" | "running" | "success" | "error" | "cancelled";
    title: string;
    items?: Array<{
      content?: string;
      toolCall?: { icon?: React.ReactNode; title?: string; content?: string };
      files?: Array<{ icon?: string; name: string }>;
      taskList?: {
        taskListId: string;
        title?: string;
        tasks: TodoItem[];
      };
    }>;
    defaultOpen?: boolean;
  }>;
}

export type MessagePart =
  | TextPart
  | FormPart
  | TaskListPart
  | ExecutionResultPart
  | ThinkingPart;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
}

// ==================== 交互式表单组件 ====================

interface InteractiveFormProps {
  formPart: FormPart;
  onSubmit: (formData: Record<string, unknown>) => void;
}

function InteractiveForm({ formPart, onSubmit }: InteractiveFormProps) {
  const formRef = useRef<DynamicFormRef>(null);

  return (
      <DynamicForm
        ref={formRef}
        schema={formPart.schema}
        showActions={true}
        readonly={false}
        submitText="确认"
        resetText="重置"
        onFinish={(values) => {
          onSubmit(values);
        }}
      />
  );
}

// ==================== 渲染单个 Part ====================

function renderTextPart(part: TextPart): React.ReactNode {
  return <Markdown key={part.id} content={part.text} />;
}

function renderFormPart(part: FormPart): React.ReactNode {
  return (
    <DynamicForm
      key={part.id}
      schema={part.schema}
      showActions={false}
      readonly={true}
    />
  );
}

function renderTaskListPart(part: TaskListPart): React.ReactNode {
  return (
    <TaskList
      key={part.id}
      dataSource={part.tasks}
      title={part.title || "待办清单"}
      status="pending"
      editable={false}
      onItemsChange={() => {}}
      onConfirmExecute={() => {}}
    />
  );
}

function renderExecutionResultPart(part: ExecutionResultPart): React.ReactNode {
  return (
    <ExecutionResult
      key={part.id}
      title={part.items.length > 0 ? part.title || "工具调用" : undefined}
      items={part.items}
    />
  );
}

function renderThinkingPart(part: ThinkingPart, activeTaskListIds: Set<string>, onConfirmTaskList?: (taskListId: string, tasks: Array<{ id: string; content: string; completed?: boolean }>) => void): React.ReactNode {
  const contentBlocks: ThinkingStepContentBlock[] = [];

  if (part.steps && part.steps.length > 0) {
    // 处理每个 step，如果有 item 包含 taskList，则合并到 content 中渲染
    const processedSteps = part.steps.map((step) => {
      if (step.items) {
        const newItems = step.items.map((item) => {
          if (item.taskList) {
            // 判断这个 taskList 是否处于活跃状态（pending 或已确认）
            const isActive = activeTaskListIds.has(item.taskList.taskListId);
            
            // 把 taskList 合并到 content 中渲染
            return {
              ...item,
              content: (
                <div>
                  {item.content}
                  <div className="mt-4">
                    <TaskListWithState
                      taskList={item.taskList}
                      isActive={isActive}
                      onConfirm={onConfirmTaskList}
                    />
                  </div>
                </div>
              ),
            };
          }
          return item;
        });
        return { ...step, items: newItems };
      }
      return step;
    });

    contentBlocks.push({
      type: "subSteps",
      steps: processedSteps as ThinkingStepItemProps[],
    });
  }

  return (
    <ThinkingStep
      key={part.id}
      title={part.title}
      status={part.status}
      duration={part.duration}
      contentBlocks={contentBlocks.length > 0 ? contentBlocks : undefined}
    />
  );
}

// 渲染函数映射
const partRenderers: Record<string, (part: MessagePart) => React.ReactNode | null> = {
  text: renderTextPart as (part: MessagePart) => React.ReactNode,
  form: renderFormPart as (part: MessagePart) => React.ReactNode,
  "task-list": renderTaskListPart as (part: MessagePart) => React.ReactNode,
  "execution-result": renderExecutionResultPart as (part: MessagePart) => React.ReactNode,
  thinking: renderThinkingPart as (part: MessagePart) => React.ReactNode,
};

// ==================== 主组件 ====================

interface PendingInteraction {
  type: "form" | "tasklist";
  id: string;
  formData?: Record<string, unknown>;
}

interface ComposerMarkdownProps {
  message?: ChatMessage | null;
  pendingInteraction?: PendingInteraction | null;
  onConfirmForm?: (formData: Record<string, unknown>) => void;
  onUpdateTaskList?: (taskListId: string, tasks: Array<{ id: string; content: string; completed?: boolean }>) => void;
}

export function ComposerMarkdown({
  message,
  pendingInteraction,
  onConfirmForm,
  onUpdateTaskList,
}: ComposerMarkdownProps) {
  console.log("[ComposerMarkdown] Rendering:", {
    hasMessage: !!message,
    messageId: message?.id,
    partsCount: message?.parts?.length ?? 0,
    parts: message?.parts?.map(p => p.id + "|" + p.type) ?? []
  });

  // 使用内部状态跟踪已确认的 taskList ID
  const [confirmedTaskListIds, setConfirmedTaskListIds] = React.useState<Set<string>>(new Set());

  // 查找当前 pending 的 taskList ID（只有 type 为 "tasklist" 时才有效）
  const pendingTaskListId = pendingInteraction?.type === "tasklist" ? pendingInteraction.id : null;

  // 合并：pending 或已确认的 taskList ID
  const activeTaskListIds = React.useMemo(() => {
    const ids = new Set<string>(confirmedTaskListIds);
    if (pendingTaskListId) {
      ids.add(pendingTaskListId);
    }
    return ids;
  }, [confirmedTaskListIds, pendingTaskListId]);

  if (!message) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>暂无消息</p>
      </div>
    );
  }

  const containerClass = message.role === "user"
    ? "flex justify-end w-full"
    : "flex justify-start w-full";

  // 处理 taskList 确认
  const handleTaskListConfirm = (taskListId: string, tasks: Array<{ id: string; content: string; completed?: boolean }>) => {
    // 标记为已确认
    setConfirmedTaskListIds(prev => new Set(prev).add(taskListId));
    // 调用父组件回调继续流式
    onUpdateTaskList?.(taskListId, tasks);
  };

  return (
    <div className={containerClass}>
      <div className="w-fit max-w-[80%]">
        {message.parts.map((part) => {
          // 检查是否是当前待确认的表单
          const isPendingForm = pendingInteraction?.type === "form" && 
                                part.type === "form" && 
                                (part as FormPart).formId === pendingInteraction?.id;
          
          if (isPendingForm) {
            return (
              <div key={part.id} className="my-4 min-w-[600px]">
                <InteractiveForm
                  formPart={part as FormPart}
                  onSubmit={(formData) => {
                    onConfirmForm?.(formData);
                  }}
                />
              </div>
            );
          }

          if (part.type === "text") {
            return renderTextPart(part);
          }

          if (part.type === "thinking") {
            return (
              <div key={part.id} className="my-4 min-w-[600px]">
                {renderThinkingPart(
                  part as ThinkingPart,
                  activeTaskListIds,
                  handleTaskListConfirm
                )}
              </div>
            );
          }

          return (
            <div key={part.id} className="my-4 min-w-[600px]">
              {partRenderers[part.type]?.(part)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

ComposerMarkdown.displayName = "ComposerMarkdown";

export default ComposerMarkdown;

// ==================== 导出类型供外部使用 ====================

export type {
  TextPart,
  FormPart,
  TaskListPart,
  ExecutionResultPart,
  ThinkingPart,
};
