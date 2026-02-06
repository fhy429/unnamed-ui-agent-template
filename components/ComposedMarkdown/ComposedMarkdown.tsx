"use client";

import React, { useRef } from "react";
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
      content: string;
      toolCall?: { icon?: React.ReactNode; title?: string; content?: string };
      files?: Array<{ icon?: string; name: string }>;
    }>;
    defaultOpen?: boolean;
  }>;
  taskList?: {
    taskListId: string;
    title?: string;
    tasks: TodoItem[];
  };
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
    <div className="border border-[#4B6FED] rounded-lg p-4 bg-[#F0F4FF]">
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
    </div>
  );
}

// ==================== 交互式任务列表组件 ====================

interface InteractiveTaskListProps {
  taskListId: string;
  title?: string;
  tasks: TodoItem[];
  onConfirm: (tasks: TodoItem[]) => void;
}

function InteractiveTaskList({ title, tasks, onConfirm }: InteractiveTaskListProps) {
  // 本地状态用于存储用户编辑的任务列表
  const [localTasks, setLocalTasks] = React.useState<TodoItem[]>([]);

  // 使用 useRef 存储初始任务列表的 ID，避免不必要的重置
  const initialTasksIdRef = React.useRef<string>(null);

  // 当 tasks prop 变化时（用户填写后继续流式），更新本地状态
  const currentTasksId = tasks.map(t => `${t.id}-${t.content}`).join(",");

  React.useEffect(() => {
    // 如果是第一次加载或者任务内容发生了变化，更新本地状态
    if (!initialTasksIdRef.current || initialTasksIdRef.current !== currentTasksId) {
      setLocalTasks(tasks.map((t) => ({
        id: t.id || String(t.order),
        content: t.content,
        order: t.order,
      })));
      initialTasksIdRef.current = currentTasksId;
    }
  }, [currentTasksId, tasks]);

  const handleTasksChange = (newTasks: Array<{ id: string; content: string; completed?: boolean; order?: number }>) => {
    setLocalTasks(newTasks.map((t, index) => ({
      id: t.id,
      content: t.content,
      order: t.order ?? index + 1,
    })));
  };

  const handleConfirm = () => {
    onConfirm(localTasks);
  };

  return (
    <div className="border border-[#4B6FED] rounded-lg p-4 bg-[#F0F4FF]">
      <TaskList
        dataSource={localTasks}
        title={title || "待办清单"}
        status="pending"
        editable={true}
        onItemsChange={handleTasksChange}
        onConfirmExecute={handleConfirm}
      />
    </div>
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

function renderThinkingPart(part: ThinkingPart): React.ReactNode {
  const contentBlocks: ThinkingStepContentBlock[] = [];

  if (part.steps && part.steps.length > 0) {
    contentBlocks.push({
      type: "subSteps",
      steps: part.steps as ThinkingStepItemProps[],
    });
  }

  if (part.taskList) {
    contentBlocks.push({
      type: "node",
      key: `tasklist-${part.taskList.taskListId}`,
      node: (
        <div className="mt-4">
          <TaskList
            dataSource={part.taskList.tasks}
            title={part.taskList.title || "待办清单"}
            status="pending"
            editable={false}
            onItemsChange={() => {}}
            onConfirmExecute={() => {}}
          />
        </div>
      ),
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
  tasks?: Array<{ id: string; content: string; completed?: boolean }>;
}

interface ComposerMarkdownProps {
  message?: ChatMessage | null;
  pendingInteraction?: PendingInteraction | null;
  onConfirmForm?: (formData: Record<string, unknown>) => void;
  onUpdateTaskList?: (tasks: Array<{ id: string; content: string; completed?: boolean }>) => void;
}

export function ComposerMarkdown({
  message,
  pendingInteraction,
  onConfirmForm,
  onUpdateTaskList,
}: ComposerMarkdownProps) {
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

          // 检查是否是当前待交互的任务列表
          const isPendingTaskList = pendingInteraction?.type === "tasklist" && 
                                   part.type === "task-list" &&
                                   (part as TaskListPart).taskListId === pendingInteraction.id;
          
          if (isPendingTaskList) {
            const taskListPart = part as TaskListPart;
            return (
              <div key={part.id} className="my-4 min-w-[600px]">
                <InteractiveTaskList
                  taskListId={taskListPart.taskListId}
                  title={taskListPart.title}
                  tasks={taskListPart.tasks}
                  onConfirm={(tasks) => {
                    onUpdateTaskList?.(tasks);
                  }}
                />
              </div>
            );
          }

          if (part.type === "text") {
            return renderTextPart(part);
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
