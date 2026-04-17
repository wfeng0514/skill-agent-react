import type {
  SkillFile,
  SkillFeature,
  LoopStep,
  PresetTask,
  AgentScenario,
} from '../types';

// ===== Skill 文件树数据 =====
export const skillTreeData: SkillFile[] = [
  {
    name: 'skill-pdf',
    type: 'folder',
    children: [
      {
        name: 'SKILL.md',
        type: 'file',
        content:
          '---\nname: skill-pdf\nversion: "1.0.0"\ndescription: |\n  提供 PDF 文件的读取、解析、转换、合并、拆分、OCR 等能力。\n  支持从 PDF 中提取文本、表格、图片，并转换为其他格式。\nmetadata:\n  tags: [pdf, document, extraction, ocr, conversion]\n  trigger_keywords:\n    - "PDF"\n    - "提取表格"\n    - "PDF转图片"\n    - "OCR识别"\n    - "合并PDF"\n    - "拆分PDF"\n  author: WorkBuddy Team\n  license: MIT\n---\n\n# PDF 处理技能\n\n> 本 Skill 为 Agent 注入 PDF 文件处理的完整能力，包括文本提取、表格解析、\n> 页面操作和 OCR 识别等功能。\n\n## 触发条件\n\n当用户请求涉及以下场景时，应加载此 Skill：\n\n- 用户提到 **"PDF"**、"提取"、"表格"、"OCR" 相关关键词\n- 需要读取或生成 `.pdf` 文件\n- 需要从扫描件/图片中提取文字\n- 需要合并、拆分、转换 PDF 页面\n\n## 能力列表\n\n| 功能 | 方法 | 说明 | 依赖 |\n|------|------|------|------|\n| 提取纯文本 | `extract_text()` | 逐页提取 PDF 文本内容 | pdfplumber |\n| 提取数据表 | `extract_tables()` | 检测并结构化提取表格数据 | pdfplumber |\n| 合并文件 | `merge(pdf_list)` | 将多个 PDF 合并为一份 | PyMuPDF |\n| 拆分页面 | `split(pages)` | 按页码范围拆分 PDF | PyMuPDF |\n| OCR 识别 | `ocr_scan(lang?)` | 扫描件/图片文字识别 | tesseract |\n| 页面转图 | `to_image(page, fmt?)` | 指定页面转为图片 | pdf2image |\n\n## 工作流程 (SOP)\n\n1. **接收任务** → 分析用户意图（提取? 转换? 合并?）\n2. **验证输入** → 检查文件是否存在、格式是否正确\n3. **选择方法** → 根据需求匹配对应的能力方法\n4. **执行处理** → 调用脚本完成实际操作\n5. **输出结果** → 返回结构化数据或生成目标文件\n6. **清理临时文件** → 删除中间产物\n\n## 依赖工具\n\n```yaml\nscripts:\n  parse_pdf.py:      # PDF 文本与表格提取（主力脚本）\n  merge_pdfs.py:      # 多文件合并\n  split_pages.py:     # 按页码拆分\n  ocr_scan.py:        # OCR 文字识别\n\npython_packages:\n  - pdfplumber >=0.10.0    # 表格提取核心\n  - PyMuPDF >=1.23.0       # 页面操作\n  - pdf2image >=1.16.0     # 页面转图片\n  - tesseract-ocr >=5.0.0  # OCR 引擎（需系统安装）\n```\n\n## 注意事项\n\n- 大文件（>50MB）建议先拆分再处理，避免内存溢出\n- OCR 结果需要人工校对，准确率约 85-95%（取决于图像质量）\n- 表格提取对复杂合并单元格支持有限，可能需要后处理',
      },
      {
        name: 'scripts/',
        type: 'folder',
        children: [
          {
            name: 'parse_pdf.py',
            type: 'file',
            content:
              'from pdfplumber import PDF\ndef parse_pdf(path: str) -> list[dict]:\n    """解析 PDF，提取文本和表格"""\n    with PDF.open(path) as pdf:\n        result = []\n        for page in pdf.pages:\n            text = page.extract_text()\n            tables = page.extract_tables()\n            result.append({"text": text, "tables": tables})\n        return result',
          },
          {
            name: 'merge_pdfs.py',
            type: 'file',
            content: '# 合并多个 PDF 文件',
          },
          { name: 'split_pages.py', type: 'file', content: '# 按页码拆分 PDF' },
          { name: 'ocr_scan.py', type: 'file', content: '# OCR 文字识别脚本' },
        ],
      },
      {
        name: 'references/',
        type: 'folder',
        children: [
          {
            name: 'pdfplumber-api.md',
            type: 'file',
            content: '# pdfplumber API 参考文档',
          },
          {
            name: 'table-extraction-patterns.md',
            type: 'file',
            content: '# 表格提取最佳实践',
          },
        ],
      },
      {
        name: 'assets/',
        type: 'folder',
        children: [
          {
            name: 'templates/',
            type: 'folder',
            children: [{ name: 'report.tpl.json', type: 'file' }],
          },
          { name: 'sample-output.pdf', type: 'file' },
        ],
      },
    ],
  },
];

// ===== Skill 核心特征 =====
export const skillFeatures: SkillFeature[] = [
  {
    icon: '📦',
    title: '知识注入',
    description:
      '加载时将领域专业知识、API文档、最佳实践注入 Agent 的上下文窗口。Agent 不再需要"猜测"怎么做。',
    color: '#6c5ce7',
  },
  {
    icon: '🔄',
    title: 'SOP 工作流',
    description:
      '内置标准操作流程（SOP），确保每一步都按专业规范执行，避免遗漏关键步骤或顺序错误。',
    color: '#00cec9',
  },
  {
    icon: '🛠️',
    title: '可执行脚本',
    description:
      '自带经过测试的脚本（如 Python 解析器），Agent 可以直接调用这些工具完成任务，而不是从零编写。',
    color: '#fd79a8',
  },
  {
    icon: '⚡',
    title: '按需加载',
    description:
      '只在任务匹配时才加载到内存中，不占日常上下文空间。一个 Agent 可以拥有数百个 Skill 但互不干扰。',
    color: '#f39c12',
  },
];

// ===== Agent 循环步骤 =====
export const loopSteps: LoopStep[] = [
  {
    step: 1,
    label: '分析上下文',
    log: '📥 收到用户任务："帮我处理这个 PDF 文件"',
    detail: '理解用户意图和当前状态',
  },
  {
    step: 2,
    label: '思考推理',
    log: '🤔 分析：这是一个 PDF 处理类任务，需要提取表格数据',
    detail: '规划下一步行动',
  },
  {
    step: 3,
    label: '选择工具',
    log: '🔧 判断需要加载 PDF Skill，使用 pdfplumber 解析',
    detail: '选择最合适的工具/Skill',
  },
  {
    step: 4,
    label: '执行动作',
    log: '⚡ 调用 use_skill("pdf")，加载 PDF 专家技能',
    detail: '调用工具执行',
  },
  {
    step: 5,
    label: '获取结果',
    log: '📤 Skill 返回解析结果：检测到 3 个数据表',
    detail: '接收工具返回的观察结果',
  },
  {
    step: 6,
    label: '迭代/完成',
    log: '✅ 任务完成！已将表格转换为 Excel 格式并交付',
    detail: '输出最终结果给用户',
  },
];

// ===== 实验场预设任务 =====
export const presetTasks: PresetTask[] = [
  {
    id: 'pdf',
    label: '📄 PDF 处理',
    task: '帮我把这份 PDF 报告里的数据表格提取出来，转换成 Excel 格式',
  },
  {
    id: 'xlsx',
    label: '📊 数据分析',
    task: '分析这份销售数据的 Excel 表格，生成一份月度趋势图表报告',
  },
  {
    id: 'pptx',
    label: '📽️ PPT 制作',
    task: '帮我做一份关于 AI 技术发展的 PPT 幻灯片，10页左右',
  },
  {
    id: 'code',
    label: '💻 编写代码',
    task: '用 React 写一个响应式的 Todo 应用，支持添加、删除、完成标记',
  },
  {
    id: 'browser',
    label: '🌐 浏览器自动化',
    task: '打开某个网站，自动填写登录表单并截图保存结果',
  },
];

// ===== 实验场 Agent 场景模拟 =====
export const agentScenarios: AgentScenario = {
  pdf: [
    {
      type: 'step',
      text: '[1/7] 📥 接收用户任务：提取 PDF 报告中的数据表格 → 转换为 Excel',
    },
    {
      type: 'step',
      text: '[2/7] 🔍 分析任务类型：涉及 PDF 操作 + 数据处理 + Excel 输出',
    },
    {
      type: 'step',
      text: '[3/7] ⚡ 匹配 Skill：检测到 "pdf" 和 "xlsx" 技能可用，准备加载',
    },
    {
      type: 'skill',
      text: '[4/7] 📦 加载 Skill: use_skill("pdf") — 注入 PDF 解析知识 + SOP',
    },
    {
      type: 'tool',
      text: '[5/7] 🛠️ 执行脚本: scripts/parse_pdf.py — 使用 pdfplumber 提取表格',
    },
    {
      type: 'skill',
      text: '[6/7] 📦 加载 Skill: use_skill("xlsx") — 注入 Excel 生成能力',
    },
    {
      type: 'tool',
      text: '[6/7] 🛠️ 执行脚本: scripts/create_xlsx.py — 将数据写入 .xlsx 文件',
    },
    {
      type: 'result',
      text: '[7/7] ✅ 完成！生成文件: output/report_tables.xlsx（包含 3 张工作表）',
    },
  ],
  xlsx: [
    {
      type: 'step',
      text: '[1/5] 📥 接收用户任务：分析 Excel 销售数据 + 生成趋势图报告',
    },
    {
      type: 'step',
      text: '[2/5] 🔍 分析任务类型：涉及 Excel 数据分析 + 图表可视化',
    },
    {
      type: 'skill',
      text: '[3/5] 📦 加载 Skill: use_skill("xlsx") — 注入数据处理能力',
    },
    {
      type: 'tool',
      text: '[4/5] 🛠️ 读取 Excel → 计算月度汇总 → 生成趋势图 HTML',
    },
    {
      type: 'result',
      text: '[5/5] ✅ 完成！生成文件: sales_report.html + sales_analysis.xlsx',
    },
  ],
  pptx: [
    {
      type: 'step',
      text: '[1/6] 📥 接收用户任务：制作 AI 技术发展 PPT，约 10 页',
    },
    {
      type: 'step',
      text: '[2/6] 🔍 分析任务类型：PPT 制作，需要结构化内容 + 设计排版',
    },
    {
      type: 'skill',
      text: '[3/6] 📦 加载 Skill: use_skill("pptx") — 注入幻灯片制作能力',
    },
    {
      type: 'tool',
      text: '[4/6] 🛠️ 规划大纲：封面→背景→发展历程→核心技术→未来展望...',
    },
    {
      type: 'tool',
      text: '[5/6] 🛠️ 逐页创建幻灯片，填充内容、设置样式、插入图片占位',
    },
    {
      type: 'result',
      text: '[6/6] ✅ 完成！生成文件: ai_tech_development.pptx（10页，含动画）',
    },
  ],
  code: [
    {
      type: 'step',
      text: '[1/8] 📥 接收用户任务：用 React 编写响应式 Todo 应用',
    },
    {
      type: 'step',
      text: '[2/8] 🔍 规划项目结构：组件拆分、状态管理、CSS 方案',
    },
    {
      type: 'step',
      text: '[3/8] 🛠️ 创建项目骨架：src/components/, src/hooks/, src/styles/',
    },
    { type: 'tool', text: '[4/8] 📝 编写 TodoApp.jsx — 主组件，状态管理中心' },
    { type: 'tool', text: '[5/8] 📝 编写 TodoItem.jsx — 单条待办组件，带动画' },
    { type: 'tool', text: '[6/8] 📝 编写 TodoForm.jsx — 添加/编辑表单组件' },
    {
      type: 'tool',
      text: '[7/8] 🎨 编写 style.css — 响应式布局、暗色模式支持',
    },
    {
      type: 'result',
      text: '[8/8] ✅ 完成！项目就绪：npm run dev 启动开发服务器即可预览',
    },
  ],
  browser: [
    {
      type: 'step',
      text: '[1/7] 📥 接收用户任务：打开网站 → 自动填表 → 截图保存',
    },
    { type: 'step', text: '[2/7] 🔍 分析任务类型：浏览器自动化操作' },
    {
      type: 'skill',
      text: '[3/7] 📦 加载 Skill: Browser Automation / playwright-cli',
    },
    {
      type: 'tool',
      text: '[4/7] 🌐 打开目标页面：browser.navigate("https://example.com/login")',
    },
    {
      type: 'tool',
      text: '[5/7] ⌨️ 自动填表：定位输入框 → 填入账号密码 → 点击提交按钮',
    },
    { type: 'tool', text: '[6/7] 📸 等待页面加载完成 → 全页截图保存' },
    {
      type: 'result',
      text: '[7/7] ✅ 完成！截图已保存: screenshots/login_result.png',
    },
  ],
};

// ===== 导航项 =====
export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

export const navItems: NavItem[] = [
  { id: 'skill', label: 'Skill', icon: '📦' },
  { id: 'agent', label: 'Agent', icon: '🤖' },
  { id: 'relation', label: '关系', icon: '🔗' },
  { id: 'playground', label: '实验场', icon: '🧪' },
];
