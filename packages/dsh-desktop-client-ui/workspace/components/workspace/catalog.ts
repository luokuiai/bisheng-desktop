export const catalogSections = [
  {
    title: "对话与输入",
    items: [
      ["agent-chat", "流式 AI 对话", "/chat", "进入演示后发送消息、停止回复，或打开会话历史。"],
      ["agent-runtime", "模型连接与流式接口", "/model", "检查模型配置，并进入对话试用流式回复。"],
      ["composer", "对话输入器", "/lab#composer", "打开模型与附件菜单，修改推理强度，再发送提示词。"],
      ["composer-panel", "多行输入面板", "/lab#composer-panel", "切换权限、模型与工作区状态，发送多行内容。"],
      ["composer-attachments", "附件队列", "/lab#composer-attachments", "重播附件加入过程，并尝试移除文件。"],
      ["composer-loader", "输入器加载光效", "/lab#composer-loader", "切换等待和就绪状态，观察输入器的边缘效果。"],
      ["token-input", "引用与快捷命令", "/lab#token-input", "输入 @ 引用文件，或用 / 选择快捷命令。"],
    ],
  },
  {
    title: "代理活动与用量",
    items: [
      ["agent-thinking", "思考状态", "/lab#agent-thinking", "查看四种思考动效和耗时。"],
      ["agent-log", "流式事件日志", "/lab#agent-log", "重播任务，查看事件逐行出现和连接。"],
      ["agent-progress", "执行进度", "/lab#agent-progress", "折叠或展开进度，查看当前步骤与完成状态。"],
      ["task-list", "执行任务列表", "/lab#task-list", "暂停和重播任务，查看步骤及文件标签。"],
      ["web-search", "检索轨迹", "/lab#web-search", "展开示例检索来源，查看引用链接。"],
      ["questionnaire", "澄清问卷", "/lab#questionnaire", "完成单选、多选或自填问题，查看提交结果。"],
      ["agent-limits-card", "上下文与配额", "/lab#agent-limits-card", "展开上下文窗口，查看用量分项和重置时间。"],
    ],
  },
  {
    title: "多代理与工作空间",
    items: [
      ["agent-avatar", "动态代理头像", "/lab#agent-avatar", "移动指针观察角色，或通过编辑器改变造型。"],
      ["agent-creator", "代理创建器", "/lab#agent-creator", "编辑身份、头像、表情和语音偏好。"],
      ["app-shell", "对话工作台框架", "/components", "体验工作台侧栏、手机导航和组件目录。"],
      ["contributions-card", "活动贡献热力图", "/lab#contributions-card", "查看贡献分布、每日统计并切换活动周期。"],
    ],
  },
  {
    title: "完整页面模板",
    items: [
    ],
  },
] as const;

export const catalogCount = catalogSections.reduce((total, section) => total + section.items.length, 0);
