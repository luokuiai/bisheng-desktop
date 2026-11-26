# Proposal

## Why

桌面端「账号设置 → 账号与用量」当前是插件内自维护的统计卡与单一日历格，与 `luokuiai-ui` 中「AI 活动档案」的视觉语言不一致，也与 Web 两端的改造目标脱节。此次按同一参考图重做展示层，沿用现有企业用量接口、桥接数据结构与主进程隔离会话，不改数据链路与凭据存储。

## What Changes

### P1（本次规格范围）

- 重构 `dsh-desktop-settings` 中 `desktop.account.usage` slot 的 `Usage` 组件，改为纵向卡片栈：
  - 身份卡：静态封面、头像或首字母、用户名与 `@组织单位`；桌面端不展示角色名称或角色徽章；
  - 「今年的贡献 N 次」；同比仅在现有数据可比较时显示，否则隐藏；
  - 四格指标：累计词元、峰值词元、最长任务、最长连续记录；最长任务在现有桥接无字段时显示「—」；
  - 活动热力图，支持「每周 / 每月 / 每年」切换，分别使用近 7 / 42 / 266 天滚动窗口；
  - 词元趋势卡：当前值、环比、紫色面积图。
- 以本地 `luokuiai-ui` 源码为唯一事实来源复刻参考页内容列，部署 URL 只做视觉对照；对齐 680px 内容列、165px 封面、80px 头像、24px 身份卡圆角、13px 热力格、20px 词元卡与 hover/入场动效。
- 保留个人存储进度与企业模型列表，放在趋势卡之后，样式与新卡片体系一致。
- 移除「剩余积分」：`Usage` 不再接收 `credits` / `creditsLabel` / `creditsHelp`，删除对应 UI 与文案键；用量页只展示词元、消息、存储与模型。
- 账号头部上方增加静态封面横幅：图片以内联资源或同目录静态资源随插件打包，仅作装饰，不支持上传、编辑或按账号替换。
- `window.dshEnterpriseChat.usage()` 的调用方式、请求参数与返回结构保持不变；不新增区间参数或响应字段，所有指标从现有 `summary.data.totals` 与 `points` 派生。
- 新增独立的只读身份资料投影：主进程复用隔离企业会话读取 `/api/v1/user/info` 与 `/api/v1/dsh/me/profile`，只向渲染进程提供 `avatar`、`department_name`，不暴露 token / cookie；用户名由 enterprise 插件通过 slot 的 `identity` prop 传入。
- 覆盖 loading / signedOut / unsupported / error / empty / 缺用量六种状态，错误态提供重试。
- **延后到 P2**：「代理活动」柱状图、分享/编辑按钮。
- **不引入** `@luokui/ui` 运行时依赖，不把插件改成 TSX，不新增 Tailwind 构建链路。

### 明确不做

- 不迁移历史数据，不新增数据库表。
- 不展示角色名称或角色徽章：企业用户可能拥有多个角色，当前接口没有稳定的单一展示角色；本次不新增 `role_name` 字段，也不为角色额外请求接口。
- 不改变企业登录、隔离会话、凭据存储、`usage()` 桥接结构与既有接口路径；新增的 profile 投影只读、可选、失败可降级。
- 不重做设置弹窗导航，只改「账号与用量」内容区。
- 不复制参考站的全局侧边栏、顶部壳与移动端抽屉；桌面端沿用现有设置弹窗。
- 平台基线固定为 Bisheng `v3.0.2`：只使用 `/api/v1/user/info`、`/api/v1/dsh/me/profile`、`/api/v1/dsh/me/usage-summary` 与 `/api/v1/quota/effective` 等既有接口，不依赖 3.1 专有的 `bs_client` 配置或租户头准入。

## Capabilities

### New Capabilities

- `desktop/account-usage`: 桌面端「账号与用量」页的身份卡、贡献与指标、三模式热力图、趋势图、存储与企业模型展示契约。

### Modified Capabilities

无。当前仓库尚未建立 OpenSpec 主规格，本次只新增能力规格。

## Impact

- `packages/dsh-desktop-settings/client.js`：`Usage` 组件 markup、`dshUsage*` 样式、静态封面常量、双语文案。
- `packages/dsh-desktop-enterprise/client.js`：移除 connected 状态的旧身份块、模型列表样式。
- `src/main/enterprise/chat-view.ts`、`src/main/index.ts`、`src/preload/index.ts`：新增只读 `profile()` 投影与 IPC/preload 类型；`usage()` 保持不变。
- `src/shared/enterprise-usage.ts`：用量数据结构不改；如新增 profile 类型，只增加独立只读类型，不复用或改变 `EnterpriseUsage`。
- `test/desktop-settings-view.test.mjs`、`test/desktop-account-presentation.test.mjs`、`test/enterprise-usage.test.ts` 等结构断言需要同步。
- 无新增运行时依赖。
