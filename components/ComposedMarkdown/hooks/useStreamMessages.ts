"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { MessagePart, ChatMessage, FormPart, TaskListPart } from "../ComposedMarkdown";

// ==================== 消息部分的类型定义 ====================

interface PendingInteraction {
  type: "form" | "tasklist";
  id: string;
  formData?: Record<string, unknown>;
  tasks?: Array<{ id: string; content: string; completed?: boolean }>;
}

// ==================== Hook 接口 ====================

interface UseStreamMessagesOptions {
  chunks: ChatMessage[];
  onComplete?: () => void;
}

interface UseStreamMessagesReturn {
  messages: MessagePart[];
  isStreaming: boolean;
  currentMessageIndex: number;
  startStream: () => void;
  reset: () => void;
  pendingInteraction: PendingInteraction | null;
  confirmForm: (formData: Record<string, unknown>) => void;
  updateTaskList: (tasks: Array<{ id: string; content: string; completed?: boolean }>) => void;
}

// ==================== Hook 实现 ====================

export function useStreamMessages({ chunks, onComplete }: UseStreamMessagesOptions): UseStreamMessagesReturn {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [allParts, setAllParts] = useState<MessagePart[]>([]);
  const [pendingInteraction, setPendingInteraction] = useState<PendingInteraction | null>(null);
  
  // 使用 ref 存储 pendingInteraction，避免 useState 闭包问题
  const pendingInteractionRef = useRef<PendingInteraction | null>(null);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  
  // 存储已交互的表单和任务列表数据
  const interactedFormsRef = useRef<Map<string, Record<string, unknown>>>(new Map());
  const interactedTaskListsRef = useRef<Map<string, Array<{ id: string; content: string; completed?: boolean }>>>(new Map());
  
  // 使用 ref 存储回调函数
  const processNextRef = useRef<(() => void) | null>(null);

  // 同步 pendingInteraction 和 ref
  useEffect(() => {
    pendingInteractionRef.current = pendingInteraction;
  }, [pendingInteraction]);

  // 内部处理函数
  const doProcessNext = useCallback(() => {
    if (isProcessingRef.current) {
      return;
    }
    isProcessingRef.current = true;

    const currentIdx = currentIndexRef.current;

    if (currentIdx >= chunks.length) {
      setIsStreaming(false);
      isProcessingRef.current = false;
      onComplete?.();
      return;
    }

    const message = chunks[currentIdx];
    
    setMessageIndex(currentIdx);
    setIsStreaming(true);

    // 分离表单、任务列表和非交互部分
    const formParts = message.parts.filter((p): p is FormPart => p.type === "form");
    const taskListParts = message.parts.filter((p): p is TaskListPart => p.type === "task-list");
    const nonInteractiveParts = message.parts.filter((p) => p.type !== "form" && p.type !== "task-list");

    // 先添加所有非交互部分
    if (nonInteractiveParts.length > 0) {
      setAllParts((prevParts) => {
        const newParts = [...prevParts];
        for (const part of nonInteractiveParts) {
          const existingPartIndex = newParts.findIndex((p) => p.id === part.id);
          if (existingPartIndex >= 0) {
            newParts[existingPartIndex] = part;
          } else {
            newParts.push(part);
          }
        }
        return newParts;
      });
    }

    // 检查是否有任务列表需要用户交互
    if (taskListParts.length > 0) {
      const firstTaskList = taskListParts[0] as TaskListPart;
      const taskListId = firstTaskList.taskListId;
      
      // 检查是否已经有交互数据
      const existingTasks = interactedTaskListsRef.current.get(taskListId);
      
      setAllParts((prevParts) => {
        const newParts = [...prevParts];
        const existingPartIndex = newParts.findIndex((p) => p.id === firstTaskList.id);
        
        if (existingTasks) {
          const updatedTaskList: TaskListPart = {
            ...firstTaskList,
            tasks: existingTasks.map((task, index) => ({
              id: task.id || String(index + 1),
              content: task.content,
              order: index + 1,
            })),
          };
          if (existingPartIndex >= 0) {
            newParts[existingPartIndex] = updatedTaskList;
          } else {
            newParts.push(updatedTaskList);
          }
        } else {
          if (existingPartIndex < 0) {
            newParts.push(firstTaskList);
          }
        }
        return newParts;
      });
      
      // 如果还没有交互数据，暂停并等待用户交互
      if (!existingTasks) {
        const newInteraction: PendingInteraction = {
          type: "tasklist",
          id: taskListId,
          tasks: firstTaskList.tasks.map((t) => ({
            id: t.id,
            content: t.content,
            completed: false,
          })),
        };
        setPendingInteraction(newInteraction);
        pendingInteractionRef.current = newInteraction;
        isProcessingRef.current = false;
        return;
      }
    }

    // 检查是否有表单需要用户交互
    if (formParts.length > 0) {
      const firstForm = formParts[0] as FormPart;
      const formId = firstForm.formId;
      
      // 检查是否已经有交互数据
      const existingFormData = interactedFormsRef.current.get(formId);
      
      setAllParts((prevParts) => {
        const newParts = [...prevParts];
        const existingPartIndex = newParts.findIndex((p) => p.id === firstForm.id);
        
        if (existingFormData) {
          const updatedForm: FormPart = {
            ...firstForm,
            schema: {
              ...firstForm.schema,
              fields: firstForm.schema.fields.map((field) => ({
                ...field,
                defaultValue: field.name in existingFormData ? existingFormData[field.name] : field.defaultValue,
              })),
            },
          };
          if (existingPartIndex >= 0) {
            newParts[existingPartIndex] = updatedForm;
          } else {
            newParts.push(updatedForm);
          }
        } else {
          if (existingPartIndex < 0) {
            newParts.push(firstForm);
          }
        }
        return newParts;
      });
      
      // 如果还没有交互数据，暂停并等待用户交互
      if (!existingFormData) {
        const newInteraction: PendingInteraction = {
          type: "form",
          id: formId,
        };
        setPendingInteraction(newInteraction);
        pendingInteractionRef.current = newInteraction;
        isProcessingRef.current = false;
        return;
      }
    }

    // 如果没有交互需求，继续处理下一条
    currentIndexRef.current = currentIdx + 1;
    const delay = currentIndexRef.current < chunks.length ? 1500 : 0;
    
    if (delay > 0) {
      timerRef.current = setTimeout(() => {
        isProcessingRef.current = false;
        processNextRef.current?.();
      }, delay);
    } else {
      timerRef.current = setTimeout(() => {
        setIsStreaming(false);
        isProcessingRef.current = false;
        onComplete?.();
      }, 500);
    }
  }, [chunks, onComplete]);

  // 更新 ref
  useEffect(() => {
    processNextRef.current = doProcessNext;
  }, [doProcessNext]);

  // 确认表单
  const confirmForm = useCallback((formData: Record<string, unknown>) => {
    const currentInteraction = pendingInteractionRef.current;
    
    if (currentInteraction && currentInteraction.type === "form") {
      const formId = currentInteraction.id;
      
      // 1. 保存表单数据到 interactedFormsRef（关键！这样 doProcessNext 知道已经交互过）
      interactedFormsRef.current.set(formId, formData);
      
      // 2. 更新 allParts 中的表单数据（用于显示）
      setAllParts((prevParts) => {
        const newParts = [...prevParts];
        const formPart = newParts.find((p): p is FormPart => p.type === "form" && (p as FormPart).formId === formId);
        
        if (formPart) {
          const updatedForm: FormPart = {
            ...formPart,
            schema: {
              ...formPart.schema,
              fields: formPart.schema.fields.map((field) => ({
                ...field,
                defaultValue: field.name in formData ? formData[field.name] : field.defaultValue,
              })),
            },
          };
          const index = newParts.findIndex((p) => p.id === formPart.id);
          newParts[index] = updatedForm;
        }
        return newParts;
      });
      
      // 3. 清除待交互状态
      setPendingInteraction(null);
      pendingInteractionRef.current = null;
      
      // 4. 延迟后继续处理下一条
      setTimeout(() => {
        isProcessingRef.current = false;
        doProcessNext();
      }, 100);
    }
  }, [doProcessNext]);

  // 更新任务列表
  const updateTaskList = useCallback((tasks: Array<{ id: string; content: string; completed?: boolean }>) => {
    const currentInteraction = pendingInteractionRef.current;
    
    if (currentInteraction && currentInteraction.type === "tasklist") {
      const taskListId = currentInteraction.id;
      
      // 1. 先更新 allParts 中的任务列表数据
      setAllParts((prevParts) => {
        const newParts = [...prevParts];
        const taskListPart = newParts.find((p): p is TaskListPart => p.type === "task-list" && (p as TaskListPart).taskListId === taskListId);
        
        if (taskListPart) {
          const updatedTaskList: TaskListPart = {
            ...taskListPart,
            tasks: tasks.map((task, index) => ({
              id: task.id || String(index + 1),
              content: task.content,
              order: index + 1,
            })),
          };
          const index = newParts.findIndex((p) => p.id === taskListPart.id);
          newParts[index] = updatedTaskList;
        }
        return newParts;
      });
      
      // 2. 清除待交互状态
      setPendingInteraction(null);
      pendingInteractionRef.current = null;
      
      // 3. 延迟后继续处理下一条
      setTimeout(() => {
        isProcessingRef.current = false;
        doProcessNext();
      }, 100);
    }
  }, [doProcessNext]);

  // 开始流式
  const startStream = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    currentIndexRef.current = 0;
    setMessageIndex(0);
    setAllParts([]);
    setIsStreaming(true);
    isProcessingRef.current = false;
    
    // 清空交互数据
    interactedFormsRef.current.clear();
    interactedTaskListsRef.current.clear();
    setPendingInteraction(null);
    pendingInteractionRef.current = null;
    
    // 延迟执行
    setTimeout(() => {
      doProcessNext();
    }, 100);
  }, [doProcessNext]);

  // 重置
  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    currentIndexRef.current = 0;
    setMessageIndex(0);
    setIsStreaming(false);
    setAllParts([]);
    
    // 清空交互数据
    interactedFormsRef.current.clear();
    interactedTaskListsRef.current.clear();
    setPendingInteraction(null);
    pendingInteractionRef.current = null;
  }, []);

  return {
    messages: allParts,
    isStreaming,
    currentMessageIndex: messageIndex,
    startStream,
    reset,
    pendingInteraction,
    confirmForm,
    updateTaskList,
  };
}
