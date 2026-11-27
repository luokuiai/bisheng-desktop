export const templates = [
  { slug: "dashboard", name: "通用仪表盘", group: "业务运营", href: "/templates/dashboard", description: "查看营收趋势、关键指标和客户表格。", features: ["营收趋势", "客户列表"] },
  { slug: "marketing", name: "营销分析", group: "业务运营", href: "/templates/marketing", description: "追踪投放、获客漏斗、渠道访客与广告回报。", features: ["获客漏斗", "渠道分析"] },
  { slug: "finance", name: "财务分析", group: "业务运营", href: "/templates/finance", description: "检查账户余额、资金流向、组合分布和交易记录。", features: ["资金流向", "交易列表"] },
  { slug: "hr", name: "人力资源", group: "业务运营", href: "/templates/hr", description: "查看员工规模、招聘进度、参与度和组织分布。", features: ["招聘漏斗", "员工目录"] },
  { slug: "medical-profile", name: "健康档案", group: "业务运营", href: "/templates/medical-profile", description: "检查健康档案、活动、睡眠和提醒示例。", features: ["活动圆环", "睡眠评分"] },
] as const;
