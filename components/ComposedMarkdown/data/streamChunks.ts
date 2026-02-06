import type { MessagePart } from "../ComposedMarkdown";

// ==================== 流式消息类型定义 ====================

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
}

// ==================== 流式消息数据 ====================

export const streamChunks: ChatMessage[] = [
  // 第一条：文本 + 第一个表单
  {
    id: "msg-1",
    role: "assistant",
    parts: [
      {
        type: "text",
        id: "p1",
        text: "您好！我来帮您处理这个招聘需求，请先填写以下信息：",
      },
      {
        type: "form",
        id: "p2",
        formId: "recruit-form",
        schema: {
          title: "招聘需求",
          fields: [
            {
              name: "position",
              label: "招聘职位",
              type: "input",
              required: true,
              placeholder: "例如：高级AI工程师",
            },
            {
              name: "priority",
              label: "优先级",
              type: "select",
              options: [
                { value: "high", label: "高" },
                { value: "medium", label: "中" },
                { value: "low", label: "低" },
              ],
              required: true,
            },
            {
              name: "department",
              label: "所属部门",
              type: "input",
              required: true,
            },
            {
              name: "upload",
              label: "上传JD文件",
              type: "input",
              disabled: true,
              description: "支持 PDF、Word 格式",
            },
          ],
        },
      },
    ],
  },
  // 第二条：分析中
  {
    id: "msg-2",
    role: "assistant",
    parts: [
      {
        type: "text",
        id: "p3",
        text: "\n正在分析您填写的信息...",
      },
      {
        type: "thinking",
        id: "p4",
        thinkingId: "analyze",
        title: "正在分析需求...",
        status: "thinking",
        steps: [
          {
            status: "running",
            title: "解析招聘需求",
            items: [{ content: "正在提取职位、部门、优先级等关键信息..." }],
          },
        ],
      },
    ],
  },
  // 第三条：分析完成 + task-list
  {
    id: "msg-3",
    role: "assistant",
    parts: [
      {
        type: "text",
        id: "p5",
        text: "\n根据分析结果，我为您生成以下待办事项：",
      },
      {
        type: "thinking",
        id: "p4",
        thinkingId: "analyze",
        title: "需求分析完成",
        status: "completed",
        duration: 3,
        steps: [
          {
            status: "success",
            title: "解析招聘需求",
            items: [
              {
                content: "明确研究目标与边界，我将调用知识和搜索工具。",
                toolCall: {
                  title: "调取知识",
                  content: "正在从知识库调取相关资料",
                },
                files: [
                  { icon: "📄", name: "AI发展趋势.pdf" },
                  { icon: "📄", name: "AI发展历史.doc" },
                ],
              },
            ],
          },
          {
            status: "success",
            title: "生成面试问题",
            items: [
              {
                content: "已生成 10 个面试问题",
                toolCall: {
                  title: "生成问题",
                  content: "基于职位要求生成面试题库",
                },
              },
            ],
          },
          {
            status: "success",
            title: "生成风险点说明",
            items: [{ content: "已识别 3 个潜在风险点" }],
          },
        ],
        taskList: {
          taskListId: "todos",
          title: "待办事项",
          tasks: [
            { id: "t1", content: "审核候选人简历", order: 1 },
            { id: "t2", content: "安排第一轮面试", order: 2 },
            { id: "t3", content: "发放offer", order: 3 },
          ],
        },
      },
    ],
  },
  // 第四条：搜索候选人
  {
    id: "msg-4",
    role: "assistant",
    parts: [
      {
        type: "text",
        id: "p7",
        text: "\n让我帮您搜索合适的候选人...",
      },
      {
        type: "execution-result",
        id: "p8",
        execId: "search",
        title: "搜索候选人结果",
        items: [
          {
            key: "tool-1",
            status: "success",
            title: "找到 12 位候选人",
            toolName: "search_candidates",
            sections: [{ title: "结果", content: "返回 12 条匹配记录" }],
          },
          {
            key: "tool-2",
            status: "success",
            title: "分析完成",
            toolName: "analyze_candidates",
            sections: [{ title: "报告", content: "Top 3 候选人已标记" }],
          },
        ],
      },
    ],
  },
  // 第五条：确认表单
  {
    id: "msg-5",
    role: "assistant",
    parts: [
      {
        type: "text",
        id: "p9",
        text: "\n\n请确认以下信息是否正确：",
      },
      {
        type: "form",
        id: "p10",
        formId: "confirm-form",
        schema: {
          title: "确认信息",
          fields: [
            {
              name: "confirm",
              label: "确认继续处理此招聘需求",
              type: "switch",
              required: true,
            },
          ],
        },
      },
    ],
  },
];
