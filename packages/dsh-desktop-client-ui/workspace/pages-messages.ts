import { workspaceLibrary, workspaceRoutes } from './components/workspace/navigation'

const destinations = [...workspaceRoutes, ...workspaceLibrary]
type Destination = typeof destinations[number]['id']
type DestinationKey = `entry_${Destination}_${'label' | 'description' | 'category'}`
const destinationEnglish: Record<Destination, readonly [string, string, string]> = {
  chat: ['AI chat', 'Chat with your assistant, browse your history and stop a response at any time.', 'Chat'],
  agents: ['Multi-agent workspace', 'Create agents, customize their avatars and collaborate in individual or group conversations.', 'Collaboration'],
  code: ['Code workspace', 'Browse coding sessions, review changes and resize the code panel.', 'Template'],
  image: ['Image generation', 'Explore prompts, image generation, feedback and the gallery.', 'Template'],
  profile: ['AI activity', 'Review the contribution heatmap, agent activity and token usage trends.', 'Usage'],
  'project-board': ['Task board', 'Track agent tasks, move tickets between columns and inspect token usage.', 'Collaboration'],
  lab: ['Component lab', 'Try message inputs, attachments, task progress, search trails and questionnaires.', 'Components'],
  charts: ['Charts', 'Explore interactive charts for trends, distributions, conversions and activity.', 'Components'],
  icons: ['Icon library', 'Find a workspace icon, preview its sizes and copy its React component.', 'Components'],
  templates: ['Page templates', 'Open interactive templates for operations and AI workspaces.', 'Templates'],
  admin: ['AI administration', 'Explore models, agents, runs, budgets and the audit log.', 'Administration'],
}

function destinationCopy(language: 'zh' | 'en') {
  return Object.fromEntries(destinations.flatMap(item => {
    const [label, description, category] = language === 'en' ? destinationEnglish[item.id] :
      [item.label, item.description, 'category' in item ? item.category : '组件']
    return [
      [`entry_${item.id}_label`, label],
      [`entry_${item.id}_description`, description],
      [`entry_${item.id}_category`, category],
    ]
  }))
}

const copy = {
  welcome: ['与 AI 一起工作', 'Work with AI'],
  welcomeHelp: ['从流式对话到多代理协作，打开一个场景，或在实验室试用每个 AI 组件。', 'Choose a workspace, from streaming chat to multi-agent collaboration, or try individual AI components in the lab.'],
  startChat: ['开始对话', 'Start a chat'],
  browseComponents: ['浏览 AI 组件', 'Browse AI components'],
  library: ['组件、模板与管理', 'Components, templates and administration'],
  openSpaces: ['打开工作空间', 'Open a workspace'],
  destinations: ['个入口', 'destinations'],
  loadingWorkspace: ['正在打开工作区…', 'Opening workspace…'],
  pageFailed: ['无法加载此工作区页面。', 'Could not load this workspace page.'],
  missingPage: ['找不到此工作区页面', 'Workspace page not found'],
  returnHome: ['返回总览', 'Back to overview'],
  openError: ['无法打开工作区', 'Could not open the workspace'],
  sampleData: ['示例数据', 'Sample data'],
  openAgents: ['打开多代理工作区', 'Open agent workspace'],
  openCode: ['打开代码工作区', 'Open code workspace'],
  createImage: ['创建图像任务', 'Create image task'],
  actualUsage: ['工作区用量', 'Workspace usage'],
  openBoard: ['打开工作区任务', 'Open workspace tasks'],
  settings: ['设置', 'Settings'],
  general: ['常规', 'General'],
  generalDescription: ['查看桌面偏好与工作区配置。', 'View desktop preferences and workspace settings.'],
  generalAction: ['打开常规设置', 'Open general settings'],
  account: ['个人资料', 'Profile'],
  accountDescription: ['查看企业账号与登录状态。', 'View your enterprise account and sign-in status.'],
  accountAction: ['打开个人资料设置', 'Open account settings'],
  tools: ['工具', 'Tools'],
  toolsDescription: ['管理已安装工具和插件。', 'Manage installed tools and plugins.'],
  toolsAction: ['打开工具设置', 'Open tool settings'],
  storage: ['存储', 'Storage'],
  storageDescription: ['查看工作区用量与桌面数据。', 'View workspace usage and desktop data.'],
  storageAction: ['打开存储设置', 'Open storage settings'],
  viewModel: ['查看模型连接', 'View model connection'],
  openDesktop: ['打开桌面会话与插件', 'Open desktop sessions and plugins'],
  modelConnection: ['模型连接', 'Model connection'],
  modelStatus: ['模型连接状态', 'Model connection status'],
  modelReadError: ['无法读取模型配置', 'Could not read model settings'],
  checkingModel: ['正在检查模型配置…', 'Checking model configuration…'],
  modelConfigured: ['已配置', 'Configured'],
  modelService: ['模型服务', 'Model service'],
  modelMissing: ['尚未配置模型。', 'No model configured.'],
  model: ['模型', 'Model'],
  recheck: ['重新检查', 'Check again'],
  configureModel: ['配置模型', 'Configure model'],
  openChat: ['打开对话', 'Open chat'],
  taskConsole: ['任务执行台', 'Task console'],
  refresh: ['刷新', 'Refresh'],
  workspaceTasks: ['工作区任务', 'Workspace tasks'],
  enterChat: ['进入 AI 对话', 'Open AI chat'],
  filterTasks: ['筛选任务', 'Filter tasks'],
  titleFilter: ['按会话标题筛选', 'Filter by session title'],
  taskConnectionError: ['连接中断，请稍后重试。', 'Connection interrupted. Please try again.'],
  openTaskError: ['无法打开任务', 'Could not open task'],
  loadingTasks: ['正在读取工作区任务…', 'Loading workspace tasks…'],
  noMatches: ['没有匹配的会话。', 'No matching sessions.'],
  noTasks: ['还没有任务。', 'No tasks yet.'],
  running: ['运行中', 'Running'],
  idle: ['空闲', 'Idle'],
  fullEditor: ['打开完整任务编辑器', 'Open full task editor'],
  taskPrompt: ['任务提示词', 'Task prompt'],
  imagePrompt: ['描述你想生成的图像', 'Describe the image you want to generate'],
  codePrompt: ['输入代码任务', 'Describe your coding task'],
  taskWorkspaceRequired: ['请先选择工作区，再打开任务草稿。', 'Choose a workspace before opening the task draft.'],
  taskDraftConflict: ['对话中已有未发送的内容。请先处理已有草稿，再打开此任务。', 'The conversation already has an unsent draft. Finish or clear it before opening this task.'],
  taskDraftBlocked: ['对话暂时无法接收新的任务草稿，请稍后重试。', 'The conversation is currently busy. Try opening this task again shortly.'],
  editExistingDraft: ['查看已有草稿', 'View existing draft'],
  openDraft: ['打开任务草稿', 'Open task draft'],
} as const

export type PageMessage = keyof typeof copy | DestinationKey
export const pagesMessages = {
  zh: { ...destinationCopy('zh'), ...Object.fromEntries(Object.entries(copy).map(([key, value]) => [key, value[0]])) },
  en: { ...destinationCopy('en'), ...Object.fromEntries(Object.entries(copy).map(([key, value]) => [key, value[1]])) },
}
