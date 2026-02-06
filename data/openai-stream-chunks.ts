/**
 * AISDK 流式数据模拟 - 接近真实AI生成环境的细致模拟
 *
 * 特点：
 * 1.thinking拆分成多个微小步骤（工具调用、内容填充、状态变化）
 * 2.每个步骤可能分多次发送（增量更新）
 * 3.真实模拟AI生成过程中的停顿和思考
 */

import type { OpenAIStreamChunk } from "@/types/openai-stream";

// ==================== 模拟常量 ====================

const MODEL = "gpt-4o-2024-08-06";

// ==================== 思考过程细致拆分 ====================
// 使用相同的 thinkingId，实现增量合并

// 步骤基础结构
interface ThinkingItem {
  content: string;
  toolCall?: {
    title: string;
    content: string;
  };
  taskList?: {
    taskListId: string;
    title: string;
    tasks: Array<{ id: string; content: string; order: number }>;
  };
}

interface ThinkingStep {
  status: "idle" | "running" | "success" | "error" | "cancelled";
  title: string;
  items?: ThinkingItem[];
  files?: Array<{ icon: string; name: string }>;
}

interface ThinkingData {
  thinkingId: string;
  title: string;
  status: "pending" | "thinking" | "completed" | "cancelled";
  duration?: number;
  steps: ThinkingStep[];
  taskList?: {
    taskListId: string;
    title: string;
    tasks: Array<{ id: string; content: string; order: number }>;
  };
}

// ===== 步骤1：解析招聘需求 =====

// 1.1 初始状态
const thinking1_1_init: ThinkingData = {
  thinkingId: "analyze-1",
  title: "需求分析中",
  status: "thinking",
  steps: [
    {
      status: "running",
      title: "解析招聘需求",
      items: []
    }
  ]
};

// 1.2 发现要提取职位信息
const thinking1_2_position: ThinkingData = {
  thinkingId: "analyze-1",
  title: "需求分析中",
  status: "thinking",
  steps: [
    {
      status: "running",
      title: "解析招聘需求",
      items: [
        { content: "正在识别职位信息..." }
      ]
    }
  ]
};

// 1.3 开始工具调用
const thinking1_3_tool_start: ThinkingData = {
  thinkingId: "analyze-1",
  title: "需求分析中",
  status: "thinking",
  steps: [
    {
      status: "running",
      title: "解析招聘需求",
      items: [
        {
          content: "正在提取职位、部门、优先级等关键信息...",
          toolCall: {
            title: "调取知识",
            content: "正在从知识库调取相关资料"
          }
        }
      ]
    }
  ]
};

// 1.4 工具调用完成，提取结果
const thinking1_4_extract: ThinkingData = {
  thinkingId: "analyze-1",
  title: "需求分析中",
  status: "thinking",
  steps: [
    {
      status: "success",
      title: "解析招聘需求",
      items: [
        {
          content: "已提取职位：高级AI工程师，部门：AI研发部，优先级：高",
          toolCall: {
            title: "调取知识",
            content: "正在从知识库调取相关资料"
          }
        }
      ],
      files: [
        { icon: "📄", name: "AI发展趋势.pdf" },
        { icon: "📄", name: "AI发展历史.doc" }
      ]
    }
  ]
};

// ===== 步骤2：生成面试问题 =====

// 2.1 开始生成面试问题（只包含新步骤）
const thinking2_1_start: ThinkingData = {
  thinkingId: "analyze-1",
  title: "需求分析中",
  status: "thinking",
  steps: [
    {
      status: "success",
      title: "解析招聘需求",
      items: [
        {
          content: "已提取职位、部门、优先级等关键信息",
          toolCall: {
            title: "调取知识",
            content: "正在从知识库调取相关资料"
          }
        }
      ],
      files: [
        { icon: "📄", name: "AI发展趋势.pdf" },
        { icon: "📄", name: "AI发展历史.doc" }
      ]
    },
    {
      status: "running",
      title: "生成面试问题",
      items: []
    }
  ]
};

// 2.2 开始工具调用
const thinking2_2_tool_start: ThinkingData = {
  thinkingId: "analyze-1",
  title: "需求分析中",
  status: "thinking",
  steps: [
    {
      status: "success",
      title: "解析招聘需求",
      items: [
        {
          content: "已提取职位、部门、优先级等关键信息",
          toolCall: {
            title: "调取知识",
            content: "正在从知识库调取相关资料"
          }
        }
      ],
      files: [
        { icon: "📄", name: "AI发展趋势.pdf" },
        { icon: "📄", name: "AI发展历史.doc" }
      ]
    },
    {
      status: "running",
      title: "生成面试问题",
      items: [
        {
          content: "正在基于职位要求生成面试题库...",
          toolCall: {
            title: "生成问题",
            content: "基于职位要求生成面试题库"
          }
        }
      ]
    }
  ]
};

// 2.3 工具调用完成
const thinking2_3_complete: ThinkingData = {
  thinkingId: "analyze-1",
  title: "需求分析中",
  status: "thinking",
  steps: [
    {
      status: "success",
      title: "解析招聘需求",
      items: [
        {
          content: "已提取职位、部门、优先级等关键信息",
          toolCall: {
            title: "调取知识",
            content: "正在从知识库调取相关资料"
          }
        }
      ],
      files: [
        { icon: "📄", name: "AI发展趋势.pdf" },
        { icon: "📄", name: "AI发展历史.doc" }
      ]
    },
    {
      status: "success",
      title: "生成面试问题",
      items: [
        {
          content: "已生成 10 个面试问题",
          toolCall: {
            title: "生成问题",
            content: "基于职位要求生成面试题库"
          }
        }
      ]
    }
  ]
};

// ===== 步骤3：生成风险点说明 =====

// 3.1 开始生成风险点
const thinking3_1_start: ThinkingData = {
  thinkingId: "analyze-1",
  title: "需求分析中",
  status: "thinking",
  steps: [
    {
      status: "success",
      title: "解析招聘需求",
      items: [
        {
          content: "已提取职位、部门、优先级等关键信息",
          toolCall: {
            title: "调取知识",
            content: "正在从知识库调取相关资料"
          }
        }
      ],
      files: [
        { icon: "📄", name: "AI发展趋势.pdf" },
        { icon: "📄", name: "AI发展历史.doc" }
      ]
    },
    {
      status: "success",
      title: "生成面试问题",
      items: [
        {
          content: "已生成 10 个面试问题"
        }
      ]
    },
    {
      status: "running",
      title: "生成风险点说明",
      items: []
    }
  ]
};

// 3.2 风险分析工具调用
const thinking3_2_tool: ThinkingData = {
  thinkingId: "analyze-1",
  title: "需求分析中",
  status: "thinking",
  steps: [
    {
      status: "success",
      title: "解析招聘需求",
      items: [
        {
          content: "已提取职位、部门、优先级等关键信息"
        }
      ],
      files: [
        { icon: "📄", name: "AI发展趋势.pdf" },
        { icon: "📄", name: "AI发展历史.doc" }
      ]
    },
    {
      status: "success",
      title: "生成面试问题",
      items: [
        {
          content: "已生成 10 个面试问题"
        }
      ]
    },
    {
      status: "running",
      title: "生成风险点说明",
      items: [
        {
          content: "正在识别潜在风险点...",
          toolCall: {
            title: "风险分析",
            content: "分析招聘过程中可能遇到的风险"
          }
        }
      ]
    }
  ]
};

// 3.3 风险点分析完成
const thinking3_3_complete: ThinkingData = {
  thinkingId: "analyze-1",
  title: "需求分析中",
  status: "thinking",
  steps: [
    {
      status: "success",
      title: "解析招聘需求",
      items: [
        {
          content: "已提取职位、部门、优先级等关键信息"
        }
      ],
      files: [
        { icon: "📄", name: "AI发展趋势.pdf" },
        { icon: "📄", name: "AI发展历史.doc" }
      ]
    },
    {
      status: "success",
      title: "生成面试问题",
      items: [
        {
          content: "已生成 10 个面试问题"
        }
      ]
    },
    {
      status: "success",
      title: "生成风险点说明",
      items: [
        {
          content: "已识别 3 个潜在风险：1. 市场竞争激烈 2. 薪资期望可能偏高 3. 技术栈匹配度",
          toolCall: {
            title: "风险分析",
            content: "分析招聘过程中可能遇到的风险"
          }
        }
      ]
    }
  ]
};

// ===== 完成：添加taskList =====
const thinkingComplete: ThinkingData = {
  thinkingId: "analyze-1",
  title: "需求分析完成",
  status: "completed",
  duration: 3,
  steps: [
    {
      status: "success",
      title: "解析招聘需求",
      items: [
        {
          content: "已提取职位、部门、优先级等关键信息",
          toolCall: {
            title: "调取知识",
            content: "正在从知识库调取相关资料"
          }
        }
      ],
      files: [
        { icon: "📄", name: "AI发展趋势.pdf" },
        { icon: "📄", name: "AI发展历史.doc" }
      ]
    },
    {
      status: "success",
      title: "生成面试问题",
      items: [
        {
          content: "已生成 10 个面试问题",
          toolCall: {
            title: "生成问题",
            content: "基于职位要求生成面试题库"
          }
        }
      ]
    },
    {
      status: "success",
      title: "生成风险点说明",
      items: [
        {
          content: "已识别 3 个潜在风险：1. 市场竞争激烈 2. 薪资期望可能偏高 3. 技术栈匹配度",
          toolCall: {
            title: "风险分析",
            content: "分析招聘过程中可能遇到的风险"
          }
        },
        {
          content: "根据分析结果，我为您生成以下待办事项：",
          taskList: {
            taskListId: "todos",
            title: "待办事项",
            tasks: [
              { id: "t1", content: "审核候选人简历", order: 1 },
              { id: "t2", content: "安排第一轮面试", order: 2 },
              { id: "t3", content: "发放offer", order: 3 }
            ]
          }
        }
      ]
    }
  ]
};
// ==================== 工具函数 ====================

let chunkCounter = 0;
function generateChunkId(prefix: string = "chatcmpl"): string {
  chunkCounter++;
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}-${timestamp}-${random}-${chunkCounter}`;
}

// 生成延迟 chunks（模拟 AI "思考" 停顿）
function generateDelays(count: number): OpenAIStreamChunk[] {
  const chunks: OpenAIStreamChunk[] = [];
  for (let i = 0; i < count; i++) {
    chunks.push({
      id: generateChunkId("delay"),
      object: "chat.completion.chunk",
      created: Date.now(),
      model: MODEL,
      choices: [{
        index: 0,
        delta: {},
        finish_reason: null,
      }],
    });
  }
  return chunks;
}

// ==================== 场景 1：招聘需求表单（第一条消息）====================

export const recruitmentFormChunks: OpenAIStreamChunk[] = [
  // Chunk 1: 角色定义
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { role: "assistant" },
      finish_reason: null,
    }],
  },
  
  // Chunk 2-10: 文本 "您好！我来帮您处理这个招聘需求，请先填写以下信息："
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "您好！我来帮您处理这个招聘需求，请先填写以下信息：" },
      finish_reason: null,
    }],
  },
  
  // Chunk 11-30: 工具调用 - 渲染表单（完整参数）
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p2",
          type: "function",
          function: { name: "render_form_p2" },
        }],
      },
      finish_reason: null,
    }],
  },
  
  // 表单参数
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: `{"formId":"recruit-form","title":"招聘需求","fields":[{"name":"position","label":"招聘职位","type":"input","required":true,"placeholder":"例如：高级AI工程师"},{"name":"priority","label":"优先级","type":"select","options":[{"value":"high","label":"高"},{"value":"medium","label":"中"},{"value":"low","label":"低"}],"required":true},{"name":"department","label":"所属部门","type":"input","required":true},{"name":"upload","label":"上传JD文件","type":"input","disabled":true,"description":"支持 PDF、Word 格式"}]}` },
        }],
      },
      finish_reason: null,
    }],
  },
  
  // 完成
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },
  
  // 完成
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "stop",
    }],
  },
];

// ==================== 场景 2：分析中 - 细致拆分，逐步展示（第二条消息）====================
// 模拟真实 AI 生成过程：100+ 个细微的 chunks

export const analysisChunks: OpenAIStreamChunk[] = [
  // ===== 文本部分 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { role: "assistant" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "\n" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "正" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "在" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "分" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "析" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "您" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "填" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "写" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "的" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "信" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "息" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "..." },
      finish_reason: null,
    }],
  },

  // ===== 思考过程 - 步骤1开始 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinking1_1_init) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  // 模拟 AI "思考" 停顿
  ...generateDelays(3),

  // ===== 思考1.2: 识别职位信息 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinking1_2_position) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  ...generateDelays(2),

  // ===== 思考1.3: 开始工具调用 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinking1_3_tool_start) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  ...generateDelays(4),

  // ===== 思考1.4: 提取结果 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinking1_4_extract) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  ...generateDelays(3),

  // ===== 思考1.5: 添加文件 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinking1_4_extract) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  // ===== 步骤2开始 =====
  ...generateDelays(4),

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinking2_1_start) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  ...generateDelays(3),

  // ===== 思考2.2: 工具调用 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinking2_2_tool_start) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  ...generateDelays(4),

  // ===== 思考2.3: 完成 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinking2_3_complete) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  // ===== 步骤3开始 =====
  ...generateDelays(4),

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinking3_1_start) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  ...generateDelays(3),

  // ===== 思考3.2: 风险分析工具 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinking3_2_tool) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  ...generateDelays(4),

  // ===== 思考3.3: 部分风险 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinking3_3_complete) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  ...generateDelays(2),

  // ===== 思考3.4: 完整风险 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinking3_3_complete) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  // ===== 停止 =====
  ...generateDelays(2),

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "stop",
    }],
  },
];

// ==================== 场景 3：分析完成 + task-list（第三条消息）====================
// 使用相同的 thinkingId，实现与上一条消息的合并

export const analysisCompleteChunks: OpenAIStreamChunk[] = [
  // Chunk 1: 角色定义
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { role: "assistant" },
      finish_reason: null,
    }],
  },

  // Chunk 2: 思考过程 - 更新（使用相同 thinkingId）
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p4",
          type: "function",
          function: { name: "render_thinking" },
        }],
      },
      finish_reason: null,
    }],
  },

  // Chunk 3: 思考内容 - 包含 taskList 和提示文本
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(thinkingComplete) },
        }],
      },
      finish_reason: null,
    }],
  },

  // 完成
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  // 停止
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "stop",
    }],
  },
];

// ==================== 执行结果数据结构 ====================

interface ExecResultItem {
  key: string;
  status: "success" | "error" | "loading" | "idle";
  title: string;
  toolName: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

interface ExecResultData {
  execId: string;
  title?: string;
  items: ExecResultItem[];
}

// ===== 搜索候选人结果 =====

// 步骤1: 开始搜索
const execResult1_search: ExecResultData = {
  execId: "search",
  title: "搜索候选人结果",
  items: [
    {
      key: "tool-1",
      status: "loading",
      title: "正在搜索候选人...",
      toolName: "search_candidates",
      sections: [
        {
          title: "进度",
          content: "正在从人才库中搜索符合条件的候选人"
        }
      ]
    }
  ]
};

// 步骤2: 搜索完成，找到候选人
const execResult2_found: ExecResultData = {
  execId: "search",
  title: "搜索候选人结果",
  items: [
    {
      key: "tool-1",
      status: "success",
      title: "找到 12 位候选人",
      toolName: "search_candidates",
      sections: [
        {
          title: "结果",
          content: " 12 条匹配返回记录"
        }
      ]
    }
  ]
};

// 步骤3: 开始分析
const execResult3_analyze: ExecResultData = {
  execId: "search",
  title: "搜索候选人结果",
  items: [
    {
      key: "tool-1",
      status: "success",
      title: "找到 12 位候选人",
      toolName: "search_candidates",
      sections: [
        {
          title: "结果",
          content: "返回 12 条匹配记录"
        }
      ]
    },
    {
      key: "tool-2",
      status: "loading",
      title: "正在分析候选人...",
      toolName: "analyze_candidates",
      sections: [
        {
          title: "进度",
          content: "正在分析候选人的匹配度和潜力"
        }
      ]
    }
  ]
};

// 步骤4: 分析完成，标记 Top 3
const execResult4_complete: ExecResultData = {
  execId: "search",
  title: "搜索候选人结果",
  items: [
    {
      key: "tool-1",
      status: "success",
      title: "找到 12 位候选人",
      toolName: "search_candidates",
      sections: [
        {
          title: "结果",
          content: "返回 12 条匹配记录"
        }
      ]
    },
    {
      key: "tool-2",
      status: "success",
      title: "分析完成",
      toolName: "analyze_candidates",
      sections: [
        {
          title: "报告",
          content: "Top 3 候选人已标记"
        }
      ]
    }
  ]
};

// ==================== 场景 4：搜索候选人（第四条消息）====================
// 细致拆分，模拟真实 AI 生成过程

export const searchCandidatesChunks: OpenAIStreamChunk[] = [
  // ===== 角色定义 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { role: "assistant" },
      finish_reason: null,
    }],
  },

  // ===== 文本：逐字输出 "让我帮您搜索..." =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "\n" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "让" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "我" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "帮" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "您" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "搜" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "索" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "合" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "适" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "的" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "候" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "选" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "人" },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "..." },
      finish_reason: null,
    }],
  },

  // ===== 延迟 =====
  ...generateDelays(3),

  // ===== 执行结果1: 开始搜索 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p8",
          type: "function",
          function: { name: "render_execution_result" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(execResult1_search) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  // ===== 延迟 =====
  ...generateDelays(4),

  // ===== 执行结果2: 搜索完成 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p8",
          type: "function",
          function: { name: "render_execution_result" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(execResult2_found) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  // ===== 延迟 =====
  ...generateDelays(3),

  // ===== 执行结果3: 开始分析 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p8",
          type: "function",
          function: { name: "render_execution_result" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(execResult3_analyze) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  // ===== 延迟 =====
  ...generateDelays(4),

  // ===== 执行结果4: 分析完成 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p8",
          type: "function",
          function: { name: "render_execution_result" },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: JSON.stringify(execResult4_complete) },
        }],
      },
      finish_reason: null,
    }],
  },

  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },

  // ===== 延迟 =====
  ...generateDelays(2),

  // ===== 完成 =====
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "stop",
    }],
  },
];

// ==================== 场景 5：确认表单（第五条消息）====================

export const confirmFormChunks: OpenAIStreamChunk[] = [
  // Chunk 1: 角色定义
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { role: "assistant" },
      finish_reason: null,
    }],
  },
  
  // Chunk 2: 文本 "\n\n请确认以下信息是否正确："
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: { content: "\n\n请确认以下信息是否正确：" },
      finish_reason: null,
    }],
  },
  
  // Chunk 3-10: 工具调用 - 确认表单
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          id: "p10",
          type: "function",
          function: { name: "render_form_p10" },
        }],
      },
      finish_reason: null,
    }],
  },
  
  // 确认表单参数
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: "{\"formId\":\"confirm-form\",\"title\":\"确认信息\",\"fields\":[{\"name\":\"confirm\",\"label\":\"确认继续处理此招聘需求\",\"type\":\"switch\",\"required\":true}]}" },
        }],
      },
      finish_reason: null,
    }],
  },
  
  // 完成
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "tool_calls",
    }],
  },
  
  // 完成
  {
    id: generateChunkId(),
    object: "chat.completion.chunk",
    created: Date.now(),
    model: MODEL,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "stop",
    }],
  },
];

// ==================== 完整演示（按顺序组合）====================

export const fullDemoChunks: OpenAIStreamChunk[] = [
  // 第一条消息：表单
  ...recruitmentFormChunks,
  
  // 延迟
  ...(() => {
    const chunks: OpenAIStreamChunk[] = [];
    for (let i = 0; i < 10; i++) {
      chunks.push({
        id: generateChunkId("delay1"),
        object: "chat.completion.chunk",
        created: Date.now(),
        model: MODEL,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: null,
        }],
      });
    }
    return chunks;
  })(),
  
  // 第二条消息：分析中
  ...analysisChunks,
  
  // 延迟
  ...(() => {
    const chunks: OpenAIStreamChunk[] = [];
    for (let i = 0; i < 10; i++) {
      chunks.push({
        id: generateChunkId("delay2"),
        object: "chat.completion.chunk",
        created: Date.now(),
        model: MODEL,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: null,
        }],
      });
    }
    return chunks;
  })(),
  
  // 第三条消息：分析完成 + task-list
  ...analysisCompleteChunks,
  
  // 延迟
  ...(() => {
    const chunks: OpenAIStreamChunk[] = [];
    for (let i = 0; i < 10; i++) {
      chunks.push({
        id: generateChunkId("delay3"),
        object: "chat.completion.chunk",
        created: Date.now(),
        model: MODEL,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: null,
        }],
      });
    }
    return chunks;
  })(),
  
  // 第四条消息：搜索候选人
  ...searchCandidatesChunks,
  
  // 延迟
  ...(() => {
    const chunks: OpenAIStreamChunk[] = [];
    for (let i = 0; i < 10; i++) {
      chunks.push({
        id: generateChunkId("delay4"),
        object: "chat.completion.chunk",
        created: Date.now(),
        model: MODEL,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: null,
        }],
      });
    }
    return chunks;
  })(),
  
  // 第五条消息：确认表单
  ...confirmFormChunks,
];

// ==================== 导出所有场景 ====================

export type StreamScenario = 
  | "recruitment-form"
  | "analysis"
  | "analysis-complete"
  | "search-candidates"
  | "confirm-form"
  | "full-demo";

export const streamScenarios: Record<StreamScenario, OpenAIStreamChunk[]> = {
  "recruitment-form": recruitmentFormChunks,
  "analysis": analysisChunks,
  "analysis-complete": analysisCompleteChunks,
  "search-candidates": searchCandidatesChunks,
  "confirm-form": confirmFormChunks,
  "full-demo": fullDemoChunks,
};

/**
 * 根据场景名称获取对应的流式数据
 */
export function getStreamChunks(scenario: StreamScenario): OpenAIStreamChunk[] {
  return streamScenarios[scenario] || fullDemoChunks;
}

/**
 * 重置计数器
 */
export function resetChunkCounter(): void {
  chunkCounter = 0;
}
