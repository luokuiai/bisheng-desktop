import {
  RiBarChartBoxLine,
  RiChatAiLine,
  RiLayoutGridLine,
  RiLayoutMasonryLine,
  RiShapesLine,
  RiShieldUserLine,
  RiSettings3Line,
} from "@remixicon/react";

export const workspaceRoutes = [
  {
    id: "chat", href: "/chat", label: "AI 对话", icon: RiChatAiLine,
    description: "与助手进行流式对话，管理会话历史，随时暂停回复。",
    category: "对话", tone: "bg-accent-500/10 text-accent-500",
  },
] as const;

export type WorkspaceRoute = (typeof workspaceRoutes)[number];

export const workspaceLibrary = [
  { id: "charts", href: "/charts", label: "数据图表", icon: RiBarChartBoxLine, description: "查看趋势、分布、转化、流向和活动等交互图表。", category: "组件", tone: "bg-chart-1/15 text-chart-1-active" },
  { id: "icons", href: "/icons", label: "图标库", icon: RiShapesLine, description: "按场景查找线框和实心图标，预览并复制 React 用法。", category: "资源", tone: "bg-chart-4/15 text-chart-4-active" },
  { id: "templates", href: "/templates", label: "整页模板", icon: RiLayoutMasonryLine, description: "打开业务仪表盘和 AI 工作空间的完整页面。", category: "模板", tone: "bg-chart-5/15 text-chart-5-active" },
  { id: "admin", href: "/admin", label: "AI 管理后台", icon: RiShieldUserLine, description: "在示例工作区管理模型、代理、运行、预算与审计。", category: "管理", tone: "bg-accent-500/10 text-accent-500" },
] as const;

export const workspaceTools = [
  { id: "components", href: "/components", label: "AI 组件目录", icon: RiLayoutGridLine },
  { id: "settings", href: "/settings", label: "设置", icon: RiSettings3Line },
] as const;
