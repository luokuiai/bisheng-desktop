# Tasks

> 实施说明（2026-11-26）：展示层改造已直接对照 Web 端真源码落地，未再单独产出侦察与替换文档。

## 0. 封面资源

- [x] 0.4 从参考库复制 `ai-profile-cover.png` 原图并压缩为 `data:` URI，不重绘、不换色；验证方式：解压后的图片尺寸、裁切位置与源图一致，内联体积 ≤ 40KB。

## 1. 前置核对

- [x] 1.1 通读 `packages/dsh-desktop-settings/client.js` 的 `Usage` 与样式注入块，确认 `summary.data.points/totals` 与 `storage.data` 的来源不变，并确认 `credits` / `creditsLabel` / `creditsHelp` 三个 prop 将在本次改造中整体移除；验证方式：`test/desktop-settings-view.test.mjs` 的 fixture 能构造同结构数据，且改造后测试断言 DOM 中不存在剩余积分。
- [x] 1.2 确认 `packages/dsh-desktop-enterprise/client.js` 的 `dshEnterpriseIdentity`、`state.user`、`state.tenant` 与模型列表结构，列出身份卡需要的 `avatar`、`department_name` 缺口，并明确本次不展示角色（`/user/info` 的 `role` 是角色 ID 列表，多角色无法单值展示，也不新增 `role_name`、不为角色发额外请求）；验证方式：记录当前 DOM 钩子与数据缺口，供测试复用。
- [x] 1.3 记录 `src/shared/enterprise-usage.ts` 的解析上限、`usage()` 签名与 IPC 形状，作为用量“零改动”契约基线；验证方式：`npm run typecheck` 与 `test/enterprise-usage.test.ts` 在无改动时通过。

## 2. 桥接与数据格式冻结

- [x] 2.1 保持 `UsageMetrics` 字段集合不变，不新增 `billed_tokens`、`max_task_duration_seconds` 或区间参数；验证方式：`test/enterprise-usage.test.ts` 断言字段集合与改造前一致。
- [x] 2.2 保持 `usage()` 无参数、主进程请求 URL 与解析逻辑不变；验证方式：mock fetch 断言仍只请求 `/api/v1/dsh/me/usage-summary` 与 `/api/v1/quota/effective`。
- [x] 2.3 保持 `usage()` 的 IPC handler、请求参数与响应签名不变；验证方式：typecheck 通过，`test/enterprise-usage.test.ts` 无回归。
- [x] 2.4 新增只读 `profile()` IPC 与 preload 类型：主进程用现有隔离会话读取 `/api/v1/user/info` 与 `/api/v1/dsh/me/profile`，只投影 `avatar`、`department_name`（不含角色、不含 token/cookie）；验证方式：preload 测试断言返回类型只含这两个字段，profile 失败不影响 usage。
- [x] 2.5 收敛 `Usage` 的 props 签名：接收 slot 传入的 `identity`（`id?` / `username?` / `display_name?` / `name?`），删除 `credits` / `creditsLabel` / `creditsHelp`；验证方式：`test/desktop-settings-view.test.mjs` 用新签名构造，并断言旧 credits prop 不再被读取。

## 3. 用量活动与指标

- [x] 3.1 在 `dsh-desktop-settings/client.js` 新增 `buildHeatmapLayout(points, mode)`，支持周/月/年三种布局；验证方式：新增 Vitest 用例覆盖空数组、跨月、闰年与未来日期。
- [x] 3.2 新增 `deriveContribution(points)` 与 `deriveUsageStats(points, totals)`，从现有日桶计算当前年贡献、峰值词元、最长连续记录；最长任务固定「—」，同比不可得时隐藏；验证方式：单测覆盖全 `null`、单日、跨月连续、数据不足。
- [x] 3.3 重写身份卡：封面、头像/首字母、用户名、11px `@组织单位`，不渲染角色名称或徽章；验证方式：DOM 测试断言 `data-usage-identity`、首字母回退、组织单位缺失降级，并断言不存在角色节点。
- [x] 3.4 重写贡献摘要与四格指标：贡献次数、可选同比、累计词元、峰值词元、最长任务「—」、最长连续记录；验证方式：`test/desktop-settings-view.test.mjs` 断言文本与 `data-usage-metric`。
- [x] 3.5 重写热力图 markup：7 行、13px 格子、4px 间距、3px 圆角、五档 `data-level`、无轴标签、三模式切换；窗口按滚动语义——`week` 近 7 天 1 列、`month` 近 42 天 6 列、`year` 近 266 天 38 列（`week/month/year` 仅作模式名，不表示自然周期）；验证方式：DOM 测试断言三种模式的列数与 `start = end - columns * 7 天` 的日期映射，并断言无轴标签与 `aria-label`。
- [x] 3.6 提供 Token/消息指标切换（自绘按钮组 + `aria-pressed`），确保切换只改展示不重新请求；验证方式：测试中 mock `bridge.usage` 调用次数，切换后次数不增加。
- [x] 3.7 新增词元趋势卡：20px 圆角、无边框浅灰底、200px 图表、紫色线 2px、渐变 0.32→0、零值灰色虚线、hover 游标与脉冲点、当前值/环比/空态；验证方式：测试覆盖单点、连续点、全 `null`、负增长与 hover 状态。
- [x] 3.8 在 Token 视图补充输入/输出说明与缺用量提示；验证方式：测试覆盖 `missing_usage_count > 0` 与完整输入输出两种数据。

## 4. 账号头部与企业模型

- [x] 4.1 移除 enterprise 插件 usage slot 上方旧的 `dshEnterpriseIdentity` 身份块，身份展示由 `Usage` 身份卡唯一承担（logout 入口保留），并通过 `desktop.account.usage` slot 传入 `identity`；同时让 slot 的 fallback 也不再渲染积分文案；验证方式：`test/desktop-settings-view.test.mjs` 断言同页只有一个 `[data-usage-identity]`、旧 `.dshEnterpriseIdentity` 不再渲染、fallback 无积分、logout 仍可点击。
- [x] 4.2 改造 `dshEnterpriseManagedModels` 列表为分隔行，保留模型名称、提供方、能力标签与刷新按钮；验证方式：测试断言列表行数、刷新按钮 `aria-label` 与 busy 禁用。
- [x] 4.3 为模型列表与账号头部补充浅色/深色 token 样式，不新增 `--ds-*`；验证方式：全局搜索新增样式中不存在 `--ds-` 与硬编码主题色。
- [x] 4.4 新增 `USAGE_COVER_DATA_URI` 常量与封面样式：165px 高、`object-fit: cover`、`object-position: 50% 45%`、`aria-hidden`、失败回退渐变；验证方式：测试断言封面节点存在且 `src` 为 `data:`，模拟错误后回退占位。

## 5. 状态、i18n 与可访问性

- [x] 5.1 覆盖 signedOut / loading / unsupported / error / empty / 缺用量六种状态，错误态提供重试；验证方式：分别渲染并断言文案与重试调用。
- [x] 5.2 为 `zh` / `en` 同步新增文案键（贡献、峰值、最长任务、连续记录、趋势、模式切换等），删除积分类文案键，不新增角色相关文案键；禁止在组件分支硬编码整句；验证方式：切换语言后断言中英文案，且 `COPY` 两个语言对象键集合一致。
- [x] 5.3 为热力格、模式切换、指标切换、刷新按钮补充键盘与 `aria-label`；验证方式：`Tab` 聚焦格子并断言 `role` / `aria-label`，切换控件通过 `aria-pressed` 暴露选中态。
- [x] 5.4 确认动画尊重 `prefers-reduced-motion`；验证方式：新增 CSS 媒体查询，测试检查样式字符串包含该分支。

## 7. P2 待办（不在本次实现）

- [ ] 7.1 代理活动柱状图：后端补 agent 维度与按日聚合，桌面端补柱状图卡与月份切换。
- [ ] 7.2 分享：定义分享链接、公开范围与只读页。
- [ ] 7.3 编辑：补账号资料编辑接口与表单，支持昵称、头像、封面。

## Workflow follow-up

- 合并前按仓库 `docs/patch-plugin-contract.md` 与 `packages/AGENTS.md` 复核插件加载协议、CSS 命名空间与 i18n 约束。
- 归档本 OpenSpec change 前确认测试结果已记录。
