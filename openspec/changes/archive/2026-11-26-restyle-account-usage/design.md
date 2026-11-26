# Design

## Context

- 桌面端是 Electron 宿主，设置页由 `packages/dsh-desktop-settings` 注册 `settings.section` 与 `desktop.account.usage` slot；企业账号页由 `packages/dsh-desktop-enterprise` 注册 `settings.section`，并把企业公开身份 `identity` 与 `models` 作为 slot 内容交给用量组件。
- 两个插件都是手写 `client.js`，通过 `window.__ModuleLoader__.load` 加载，使用 `React.createElement`（`h()`），没有 TSX/打包链路；样式通过注入 `<style data-plugin-css>` 字符串实现。
- 用量数据来自 `window.dshEnterpriseChat.usage()`：主进程用隔离 cookie 请求 `/api/v1/dsh/me/usage-summary` 与 `/api/v1/quota/effective`，渲染进程只拿投影后的数据，不接触企业凭据。
- 现有 `Usage` 组件已经实现日桶、指标切换、tooltip、存储与模型列表；本次只替换展示层，桥接与数据格式不变。
- 平台基线为官方 Bisheng `v3.0.2`：桌面端只依赖 `/api/v1/user/info`、`/api/v1/dsh/me/profile` 等既有接口；当平台未开启 `dsh`（`browser-config.enabled=false`）时，profile 投影降级为空，用量页仍按现有 `usage()` 渲染。

参见 `proposal.md` 与 `specs/desktop/account-usage/spec.md`。

## 视觉基准

**复刻对象**：`https://luokui-ai.peng1989923.workers.dev/ai-profile` 的**内容列**，不包含该站点的全局侧边栏、顶部工具栏与移动端抽屉；桌面端继续使用现有设置弹窗与导航。

**真源码优先**：以本地组件库源码作为唯一事实来源，部署 URL 仅作视觉参照：

- `E:\Workspace\LuoKui\luokuiai-ui\workspace-ui\components\application\ai-profile\ai-profile-card.tsx`
- `E:\Workspace\LuoKui\luokuiai-ui\workspace-ui\components\application\ai-profile\tokens-chart-card.tsx`
- `E:\Workspace\LuoKui\luokuiai-ui\workspace-ui\components\application\dashboard\contributions-card.tsx`
- `E:\Workspace\LuoKui\luokuiai-ui\workspace-ui\styles\theme.css`、`typography.css`、`globals.css`
- 封面素材：`E:\Workspace\LuoKui\luokuiai-ui\demo\public\templates\ai-profile-cover.png`

任何 AI 生成的复刻分析只能作为结构参考，尺寸、字号、色值、交互必须回到源码逐项核对；无法从源码确认的值标为 `GUESS`，不得写成既定规格。

**实现路径**：参考站是 React/Next 内容页，桌面插件是手写 `client.js` + `h()`，因此按源码逐项移植尺寸、字号、色值与动效，走**源码级视觉移植**，不做逐字节复制；不额外产出侦察截图与差异报告等过程文件。

**对齐基线**（来自源码）：

| 元素 | 参考值 |
|---|---|
| 内容列 | `max-width: 680px` 居中，卡片间距 `16px` |
| 身份卡 | 圆角 `24px`，`1px` 边框，`overflow: hidden` |
| 封面 | 高 `165px`（窄窗口 120px），`object-fit: cover`，`object-position: 50% 45%` |
| 卡片内容 | 左右 `16px`，底部 `16px`，顶部 `124px`，纵向间距 `15px` |
| 头像 | `80px` 圆形，首字母 `30px / 42px`，叠压封面下沿 |
| 名称 / `@组织单位` | `20px / 26px`、`11px / 16px`，字重 500 |
| 贡献标题 / 数值 | `14px / 20px`、`24px / 34px` |
| 指标块 | 窄屏 2 列、宽屏 4 列；间距 `8px`，内边距 `10px`，圆角 `16px` |
| 指标值 / 标签 | `14px / 20px`、`13px / 18px` |
| 活动区 | 标题 `13px / 18px`，无坐标轴标签 |
| 热力格 | 「每年」模式 `7 行 × 38 列`（近 266 天），格子 `13px`，间距 `4px`，圆角 `3px` |
| 热力交互 | 每格 Tooltip，悬停放大 `1.1`，`prefers-reduced-motion` 下关闭过渡与放大 |
| 词元卡 | 浅灰底、无边框、圆角 `20px`、上下 `12px`、图表高 `200px` |
| 面积图 | 紫色线 `2px`，渐变 `0.32 → 0`，零值段灰色 `5 5` 虚线 |
| 图表 hover | 十字虚线游标、脉冲点、标题滚动到当天数值与日期 |
| X 轴 | `11px / 15px`，字重 500，字距 `0.2px`，三级文字色 |

**允许偏差白名单**（除此之外不得偏离参考视觉）：

1. 不复制参考站的全局侧边栏、顶部壳与移动端抽屉。
2. P2 的代理活动卡、分享、编辑不渲染。
3. 用真实企业身份、真实日期、真实用量替换 mock 文案与哈希数据。
4. 参考实现的「每周/每月/每年」只改 state、不改变网格；本项目允许它改变数据窗口，但必须保持 7 行、13px 格、4px 间距、无轴标签的视觉语法。
5. 桌面设置弹窗宽度与参考页不同，内容列按 680px 居中；保留存储与企业模型区。
6. 企业公开身份无头像时按首字母降级；头像与组织单位由主进程隔离会话只读投影，用户名由 enterprise 插件通过 slot 传入，渲染进程不直接请求；桌面端不展示角色徽章。

## Goals / Non-Goals

**Goals:**

- 用组件 UI 的卡片、封面、指标、三模式热力图、趋势图与排版重排「账号与用量」。
- 保持单文件插件、React 18、`h()` 渲染与 `--dsw-alias-*` token 体系。
- 覆盖 signedOut / loading / error / unsupported / empty / 缺用量状态。
- 增加四格指标与词元趋势卡；同比与最长任务在现有数据不可得时降级。

**Non-Goals:**

- 不引入 `@luokui/ui`、不新增 Tailwind 构建、不把插件迁移到 TSX。
- 不实现代理活动柱状图、最长任务以外的任务分析或分享/编辑。
- 不展示角色名称或角色徽章；企业用户可能拥有多个角色，当前接口没有稳定的单一展示角色。
- 不重做整个设置弹窗导航，只改「账号与用量」内容区。

## Decisions

### D1：在现有 `client.js` 内用 `h()` 实现，不引入组件库

**选择**：扩展 `packages/dsh-desktop-settings/client.js` 的 `Usage`，以及 `packages/dsh-desktop-enterprise/client.js` 的模型列表；connected 状态下移除企业账号页的旧身份块。

**原因**：

- 插件加载协议要求保留 `window.__ModuleLoader__.load` 与普通 JS；没有编译链路时引入 TSX 会破坏发布。
- 桌面端没有 Tailwind，组件 UI 的 class 无法直接生效。
- 复用现有 `SegmentedControl`、`Tooltip`、`Menu` 等宿主原语，保持交互一致。

**备选**：把 `@luokui/ui` 预编译后塞进插件 → 需要额外 bundle、CSS 隔离与 React 19 兼容验证，收益低、风险高，放弃。

### D2：样式只使用 `--dsw-alias-*` 语义 token

新增/改写 `dshUsage*` 与 `dshEnterprise*` 样式，全部挂在插件命名空间下，并只消费宿主 token：

| 组件 UI 语义 | 桌面端 token |
|---|---|
| 页面背景 | `--dsw-alias-bg-layer-1` |
| 卡片背景 | `--dsw-alias-bg-layer-2` |
| 次级块背景 | `--dsw-alias-interactive-bg-hover` |
| 主文字 | `--dsw-alias-label-primary` |
| 次文字 | `--dsw-alias-label-secondary` |
| 弱文字 | `--dsw-alias-label-tertiary` |
| 边框 | `--dsw-alias-border-l2` |
| 品牌/选中 | `--dsw-alias-state-business-primary` |
| 热力五档 | `color-mix(in srgb, var(--dsw-alias-state-business-primary) N%, var(--dsw-alias-interactive-bg-hover))` |
| 图表面积 | 品牌紫或 `--dsw-alias-state-business-primary` 的低透明度渐变 |

不新增 `--ds-*`，不写 `body[data-ds-dark-theme]` 分支；深色由 token 自动切换。

### D3：页面结构

```
[设置]                               [关闭]
+--------------------------------------------------+
|         [静态封面横幅 165px]                      |
|                    (LU)                          |
|                   luokui                         |
|                   @luokui                        |
|  今年的贡献                                       |
|  7,462 次  [+14.8%]                              |
|  +------------+  +------------+                  |
|  | 累计词元    |  | 峰值词元    |                  |
|  | 90 亿      |  | 5.63 亿    |                  |
|  +------------+  +------------+                  |
|  +------------+  +------------+                  |
|  | 最长任务    |  | 最长连续记录 |                  |
|  | 12小时54分  |  | 62 天      |                  |
|  +------------+  +------------+                  |
|  +--------------------------------------------+  |
|  | 活动                    [每周|每月|每年]     |  |
|  | [Token|消息]                               |  |
|  |  [13px 格子 × 7 行]                         |  |
|  |  少 ▢▢▢▢▢ 多                               |  |
|  +--------------------------------------------+  |
|  +--------------------------------------------+  |
|  | 词元                                       |  |
|  | 6.7 亿  [+9.4%]                            |  |
|  | [紫色面积图]                                |  |
|  +--------------------------------------------+  |
|  个人存储空间      已使用 1.2 GB / 10 GB         |
|  [progress]                                      |
|  企业提供的模型                          [刷新]  |
|  la/auto/gpt-6.1-terra  OpenAI 兼容 · 视觉        |
|  deepseek-chat          DeepSeek                 |
+--------------------------------------------------+
```

### D4：`Usage` 组件内部结构

保持一个组件入口，内部拆成纯函数，便于测试：

- `buildHeatmapLayout(points, mode)`：返回近 7 / 42 / 266 天三种 `cells`，不生成轴标签。
- `deriveUsageStats(points, totals)`：返回峰值词元、最长连续记录、最长任务展示值。
- `deriveContribution(points)`：从现有日桶返回当前年贡献次数与可选同比。
- `renderIdentity(identity, profile)`：身份头、封面、头像/首字母、用户名、`@组织单位`；不渲染角色徽章。
- `renderMetricTiles(stats)`：四格指标。
- `renderHeatmap(points, metric, mode)`：热力图与 tooltip。
- `renderTrend(points)`：词元面积图。
- `Usage({ t, identity, profile, models })`：组装状态与以上片段；不再接收 credits。

不新增状态管理库；沿用 `useState` / `useEffect` 与现有 subscription。

### D5：身份来源

| 字段 | 来源 | 降级 |
|---|---|---|
| 用户名 | slot `identity` 的 `username` → `display_name` → `id` | 显示「—」 |
| `@组织单位` | 主进程只读投影的 `department_name` | 隐藏该行 |
| 头像 | 主进程只读投影的 `avatar` | 使用用户名首字母生成圆形占位 |

身份层使用 enterprise 插件传入的 `identity` 与只读 profile 投影。主进程使用现有隔离企业会话请求 `/api/v1/user/info` 与 `/api/v1/dsh/me/profile`，只向渲染进程投影 `avatar`、`department_name`；token 与 cookie 不出主进程，渲染进程不直接请求企业资料。桌面端不展示角色名称或角色徽章。

视觉与行为以 Web 两端共用的 `@bisheng/ui` `UsageIdentityHeader` 为事实来源：用户名 20/26、`@组织单位` 11/16、头像 80px，字段缺失时的隐藏/回退规则与 Web 保持一致；唯一差异是桌面端不传 `badge`。

### D6：桥接与数据格式冻结

保持现有桥接原样：

```ts
usage(): Promise<EnterpriseUsage>
```

- `usage()` 仍无参数，不新增 `start_at` / `end_at`。
- `UsageMetrics` 仍只包含现有 `message_count`、`input_tokens`、`output_tokens`、`total_tokens`、`missing_usage_count`。
- 不新增 `billed_tokens`、`max_task_duration_seconds` 或其他字段。
- 主进程仍只请求现有 `/api/v1/dsh/me/usage-summary` 与 `/api/v1/quota/effective`，请求参数与解析逻辑不变。
- 页面只消费现有 `summary.data` 与 `storage.data`。

身份资料使用独立的可选只读投影，不改变 `usage()`：

```ts
profile(): Promise<{
  avatar: string | null
  department_name: string | null
} | null>
```

- `profile()` 无参数，失败时返回全空字段或抛出可降级错误，不影响用量摘要；不投影角色名称、角色 code 或任何角色字段。
- 主进程复用隔离企业会话读取 `/api/v1/user/info` 与 `/api/v1/dsh/me/profile`，不得把凭据交给渲染进程。

### D7：贡献与指标

| 指标 | 来源 | 规则 |
|---|---|---|
| 今年的贡献 | 现有 `summary.data.points` 中当前自然年的 `message_count` | 直接过滤求和，不额外调用 `usage()` |
| 贡献同比 | 现有 `points` 是否覆盖去年同期 | 覆盖且可计算时显示，否则隐藏 |
| 累计词元 | `summary.totals.total_tokens` | `null` 显示「—」 |
| 峰值词元 | `max(points.total_tokens)` | 忽略 `null`；全 `null` 显示「—」 |
| 最长任务 | 现有桥接无字段 | 固定显示「—」，不请求补充 |
| 最长连续记录 | 非零 `message_count` 的连续天数 | 按 `Asia/Shanghai` 日期 |
| 词元环比 | 现有 `points` 的近 30 天与再前 30 天 | 数据不足或上一周期为 0 时隐藏 |

### D8：热力图三模式

统一使用 7 行网格，列数随模式变化，均不渲染轴标签：

| 模式 | 范围 | 布局 | 轴标签 |
|---|---|---|---|
| 每周 | 最近 7 天 | 7 行 × 1 列 | 无 |
| 每月 | 最近 42 天 | 7 行 × 6 列 | 无 |
| 每年（默认） | 最近 266 天 | 7 行 × 38 列 | 无 |

模式名只表示展示密度，不表示自然周期。模式切换只重排已取回日桶，不调用 `usage()`；默认「每年」。当前摘要不足对应窗口时，缺失日期显示空格。热力图 MUST NOT 渲染月份轴或其他坐标轴标签。

### D9：状态机

沿用现有 `phase` 字段，但把状态映射到组件 UI 风格的空态卡片：

| 状态 | 展示 |
|---|---|
| `loading` | 骨架行 + 「加载中…」`role=status` |
| `signedOut` | 「登录企业账号后可查看」+ 登录按钮 |
| `unsupported` | 「请完全退出并重新启动客户端」 |
| `error` | 「用量统计加载失败」+ 重试 |
| `ready` + 无数据 | 卡片壳 +「暂无用量记录」 |
| `ready` + 有数据 | 身份卡 + 指标 + 热力图 + 趋势 + 存储 + 模型 |

同比不可计算时只隐藏同比；主摘要失败才进入 error。

### D10：企业账号头部与模型列表

- connected 状态下移除 `dshEnterpriseIdentity`，由 usage 身份卡唯一承担头像、用户名与 `@组织单位`；logout 动作保留。
- 模型列表保持 `<ul>` 语义，改为卡片内分隔行：名称 14px/500，提供方 12px 次级色，能力标签用 `color-mix` 轻底色。
- 刷新按钮保留 `aria-label` 与 busy 禁用。

### D11：静态封面

**选择**：在 `packages/dsh-desktop-settings/client.js` 顶部定义常量 `USAGE_COVER_DATA_URI`，存放一张压缩后的 SVG/WebP/JPEG `data:` URI，由身份头以 `<img>` 或 `background-image` 渲染。不新增图片构建步骤，也不请求远程资源。

**呈现规则**：

- 高 165px（窄窗口 120px），`object-fit: cover`，`object-position: 50% 45%`，顶部圆角与卡片一致。
- `alt=""` 且 `aria-hidden="true"`，不影响读屏顺序。
- 渲染失败时回退为品牌色低饱和渐变，不出现破图图标。
- 不做上传、裁剪、编辑，也不写入任何账号字段。

### D12：测试策略

- 更新 `test/desktop-settings-view.test.mjs`：断言身份头、贡献、四格指标、三种热力图模式、趋势卡、空态、错误重试、存储进度。
- 更新 `test/desktop-account-presentation.test.mjs`：断言旧身份块已移除、usage 身份卡包含用户名与 `@组织单位`、不包含角色徽章、模型列表为分隔行。
- 更新 `test/enterprise-usage.test.ts`：断言桥接签名、请求参数与响应字段未被改动。
- 新增纯函数测试：`buildHeatmapLayout`、`deriveContribution`、`deriveUsageStats`。
- 继续运行 `npm test` / `npm run typecheck`；不新增测试框架。

## Data Gaps

| 参考图元素 | 现有数据 | 缺口 | 处理 |
|---|---|---|---|
| 头像 | 企业公开身份无头像 | 主进程未投影 | 主进程通过隔离会话读取 `/api/v1/user/info`，缺失时首字母降级 |
| 组织单位 | `state.user` 无部门字段 | 主进程未投影 | 主进程读取 `/api/v1/dsh/me/profile` 的 `department_name` |
| 角色徽章 | `state.user` 无稳定单一角色；`role` 对非超管是角色 ID 列表 | 多角色展示规则未定 | 本次不展示角色名称或徽章，也不新增角色字段 |
| 今年的贡献 | 现有日桶 `message_count` | 无 | 前端过滤当前自然年 |
| 贡献同比 | 现有响应不覆盖去年同期 | 无 | 隐藏 Chip |
| 最长任务 | 现有桥接无字段 | 未返回 | 显示「—」，不改桥接 |
| 三模式热力图 | 日桶 | 无 | 前端重排 |
| 词元趋势 | `points.total_tokens` | 无 | 前端 SVG 面积图 |
| 代理活动 | 无 agent 维度 | 后端缺字段 | P2 |
| 分享 / 编辑 | 无接口 | 权限与资料更新 | P2 |

## Risks / Trade-offs

- [13px 格子在 800px 设置弹窗内横向溢出] → 卡片内部滚动，初次渲染滚到当前周；不渲染轴标签。
- [同比与最长任务无数据] → 同比隐藏、最长任务显示「—」，不伪造数值，也不改桥接。
- [插件内联 CSS 体积增大] → 只新增 `dshUsage*` 规则，复用现有注入块。
- [内联封面增大 `client.js` 体积] → 压缩到 40KB 以内；超限改为同目录静态文件 + 相对路径。
- [桌面端身份字段缺失与 Web 不一致] → 主进程补充只读资料投影；投影失败时隐藏组织单位并使用首字母头像；角色徽章作为明确允许的差异不渲染。
- [深色模式下 color-mix 兼容性] → Electron Chromium 已支持；不支持时回退到 `interactive-bg-hover`。
- [现有测试断言文本/结构] → 先补 `data-usage-*` 钩子，再改样式。

## Migration Plan

1. 在 `chat-view.ts` / `preload/index.ts` 增加只读 `profile()` 投影，复用现有隔离会话读取 `/api/v1/user/info` 与 `/api/v1/dsh/me/profile`，只投影 `avatar` 与 `department_name`；不改变 `usage()`。
2. 改 `dsh-desktop-settings` 的 `Usage` 与 CSS，接入身份卡、指标、三模式热力图与趋势卡，移除 credits。
3. 改 `dsh-desktop-enterprise`：connected 时移除旧身份块，传入 `identity` 与模型列表；slot fallback 同步去掉 credits 文案。
4. 更新结构测试与纯函数测试，运行 `npm test`。

回滚：插件改动按包独立回退；profile 投影为可选只读字段，失败时不影响 usage，不涉及数据迁移。

## Open Questions

- 桌面端主进程是否复用 `/user/info` 的预签名头像 URL，还是缓存头像对象；当前规格按预签名 URL 投影，过期由下次资料读取刷新。
- 角色展示本次不做；如未来需要展示，必须先定义多角色选择规则，再单独评估接口字段。
- 现有响应不覆盖去年同期，贡献同比默认隐藏；如后续要求展示，需另立后端 change。
