# Spec Delta

## Purpose

定义桌面端「账号设置 → 账号与用量」页的呈现契约：与 Web 两端使用同一套身份卡结构，展示当前企业登录用户的头像、用户名与 `@组织单位`，以及贡献、四格指标、三模式活动热力图和词元趋势；同时保留存储与企业模型，并保持主进程隔离会话与凭据边界不变。桌面端不展示角色名称或角色徽章。

## ADDED Requirements

### Requirement: 身份卡结构
页面 SHALL 在内容顶部展示与 Web 一致的身份卡：静态封面、头像或首字母、用户名与 `@组织单位`。用户名 MUST 依次取企业公开身份投影中的 `username`、`display_name`、`id`；`@组织单位` MUST 取只读资料投影中的 `department_name`。`@组织单位` 行 MUST 使用 `11px / 16px`，小于用户名的视觉层级。企业身份未提供头像时 MUST 使用名称首字母生成圆形占位，不得出现破图图标。

桌面端 MUST NOT 展示角色名称、角色徽章或任何角色字段。企业用户可能同时拥有多个角色，当前接口没有稳定的单一展示角色；为避免歧义，本次只用用户名与 `@组织单位` 表达身份。

头像与组织单位 MUST 由主进程使用现有隔离企业会话读取 `/api/v1/user/info` 与 `/api/v1/dsh/me/profile` 后投影为只读字段；用户名由 enterprise 插件通过 `desktop.account.usage` slot 的 `identity` prop 传入。渲染进程 MUST NOT 直接请求这两个接口，MUST NOT 接触 access token、refresh token 或 cookie。`usage()` 的参数与返回结构保持不变。

#### Scenario: 已登录企业账号
- **WHEN** 用户已连接企业账号并打开「账号与用量」
- **THEN** 页面显示头像、用户名与 `@组织单位`，不显示角色徽章

#### Scenario: 无头像
- **WHEN** 企业身份或资料投影中的 `avatar` 为空
- **THEN** 身份卡显示用户名首字母头像，不出现破图图标

#### Scenario: 无组织单位
- **WHEN** 资料投影缺少 `department_name`
- **THEN** 仅隐藏 `@组织单位` 行，其余身份信息与用量正常显示

#### Scenario: 多角色用户
- **WHEN** 当前企业用户拥有一个或多个角色
- **THEN** 身份卡不显示角色徽章，也不为角色额外请求接口

#### Scenario: 与 Web 视觉对齐
- **WHEN** 同一企业账号分别打开 Web 用户端与桌面端「账号与用量」
- **THEN** 两端的用户名、`@组织单位`、头像回退与字号层级保持一致；桌面端不展示角色徽章属于明确允许的差异

#### Scenario: 未登录
- **WHEN** 用户未连接企业账号
- **THEN** 页面显示「登录企业账号后可查看」与登录按钮，不显示用量数字

### Requirement: 静态封面横幅
页面 SHALL 在身份卡顶部展示一张随插件代码打包的静态封面横幅，头像与名称 MAY 叠压在其下沿。封面 MUST 使用内联 `data:` 资源或同目录静态资源，MUST NOT 请求封面接口、上传图片或在运行时按账号替换封面。

#### Scenario: 已登录时渲染封面
- **WHEN** 用户打开「账号与用量」
- **THEN** 内容顶部显示本地封面横幅，且不产生额外的封面网络请求

#### Scenario: 封面不可用
- **WHEN** 内联资源解码失败或静态文件缺失
- **THEN** 封面位置回退为品牌色渐变占位，不出现破图图标，用量数据仍正常渲染

### Requirement: 今年的贡献与同比
页面 SHALL 展示「今年的贡献 N 次」。贡献次数 SHALL 从现有 `summary.data.points` 过滤当前自然年的 `message_count` 求和，不得额外调用 `usage()`。同比百分比只在现有 `points` 同时覆盖去年同期且可计算时显示；否则 MUST 隐藏。

#### Scenario: 现有数据覆盖当前自然年
- **WHEN** 摘要的 `points` 包含当前自然年日桶
- **THEN** 页面显示今年贡献次数

#### Scenario: 现有数据不覆盖去年同期
- **WHEN** 摘要只覆盖近 365 天且不包含去年同期
- **THEN** 页面正常显示贡献、指标、热力图与趋势，仅隐藏同比

### Requirement: 四格指标定义
页面 SHALL 展示四个指标块：累计词元、峰值词元、最长任务、最长连续记录。

- 累计词元取 `summary.totals.total_tokens`；
- 峰值词元取 `points` 中单日 `total_tokens` 的最大值；
- 现有桥接没有任务时长字段，最长任务 MUST 显示「—」；
- 最长连续记录取按北京时间连续存在消息的天数。

任一指标为 `null`、缺失或无法计算时 MUST 显示「—」，不得显示 0 冒充未知。

#### Scenario: 数据完整
- **WHEN** 摘要包含完整日桶与总量
- **THEN** 四格分别显示累计词元、峰值词元、最长任务「—」、最长连续记录

#### Scenario: 最长任务不可得
- **WHEN** 页面渲染四格指标
- **THEN** 最长任务固定显示「—」，不请求桥接补充字段

#### Scenario: Token 未知
- **WHEN** 区间内有消息但 `total_tokens` 为 `null`
- **THEN** 累计词元与峰值词元显示「—」，贡献次数与连续记录仍按实际值显示

### Requirement: 活动热力图三模式
页面 SHALL 提供「每周 / 每月 / 每年」三种热力图布局，默认「每年」。三种模式 MUST 使用同一批日桶重排，不得因切换模式重新调用 `usage()`。模式名只表示展示密度，不表示自然周期。

- 每周：最近 7 天，7 行 × 1 列；
- 每月：最近 42 天，7 行 × 6 列；
- 每年：最近 266 天，7 行 × 38 列（对齐参考页密度）。

热力格 SHALL 为 13px、间距 4px、3px 圆角，并使用五档数据色阶；MUST NOT 渲染月份轴或其他坐标轴标签。每个格子 MUST 提供包含日期、Token 与消息数的提示；未来日期与区间外日期 MUST 有可区分的视觉状态。

#### Scenario: 有日桶数据
- **WHEN** `bridge.usage()` 返回 `summary.status === "ready"`
- **THEN** 页面默认渲染最近 266 天的 7 行 × 38 列热力图与图例，不显示轴标签

#### Scenario: 切换到每月
- **WHEN** 用户点击「每月」
- **THEN** 热力图按最近 42 天重排为 7 行 × 6 列，`bridge.usage()` 调用次数不增加

#### Scenario: 切换到每周
- **WHEN** 用户点击「每周」
- **THEN** 热力图按最近 7 天重排为 7 行 × 1 列，`bridge.usage()` 调用次数不增加

#### Scenario: 悬停或聚焦格子
- **WHEN** 用户悬停或用键盘聚焦某个格子
- **THEN** 显示该日期的 Token 与消息数提示，且不遮挡格子

#### Scenario: 没有用量
- **WHEN** 所有日桶的消息数与 Token 均为 0
- **THEN** 页面显示「暂无用量记录」，仍保留网格与图例

### Requirement: 指标切换
页面 SHALL 提供「词元 / 消息数」切换；切换 MUST 立即改变格子强度、图例与总量说明，不重新调用 `usage()`，也不重置滚动位置。

#### Scenario: 切到消息数
- **WHEN** 用户点击「消息数」
- **THEN** 格子按消息数着色，图例与总量说明显示消息语义

### Requirement: 词元趋势卡
页面 SHALL 在活动卡下方展示词元趋势卡，包含当前累计词元、环比百分比、紫色面积图与时间轴起止标签。趋势 SHALL 使用 `points.total_tokens` 按时间顺序绘制；Token 未知时 MUST 显示空态而不是 0 值折线；上一周期不可计算时 MUST 隐藏环比。

#### Scenario: 连续日桶
- **WHEN** `points` 包含多个有 Token 的日期
- **THEN** 趋势卡绘制连续面积图并显示累计词元与真实环比

#### Scenario: Token 全未知
- **WHEN** 所有 `points.total_tokens` 均为 `null`
- **THEN** 趋势卡显示「暂无词元数据」，不绘制 0 值折线

### Requirement: 存储与企业模型
页面 SHALL 在趋势卡下方展示个人存储已用/上限与进度；上限为不限时 MUST 显示「不限」且不显示进度条。企业模型列表 SHALL 以分隔行展示模型名称、提供方与能力标签，并保留刷新动作。

页面 MUST NOT 展示「剩余积分」或任何 credits 数字：桌面端 credits 依赖 `/api/v1/quota/effective` 的积分字段，Web 改造后已不再消费该值。`Usage` 组件 MUST NOT 再接收 `credits`、`creditsLabel`、`creditsHelp` 三个 prop，相关文案键一并删除。

#### Scenario: 不展示剩余积分
- **WHEN** 用户打开「账号与用量」
- **THEN** 页面任意位置都不出现「剩余积分」或 credits 数字，且不因 credits 缺失显示占位符

#### Scenario: 存储有限额
- **WHEN** 存储配额返回有效上限
- **THEN** 页面显示已用/上限与按比例填充的进度条

#### Scenario: 存储不限
- **WHEN** 存储配额上限为 -1
- **THEN** 页面显示「不限」，不渲染进度条

#### Scenario: 模型列表
- **WHEN** 企业状态包含可用模型
- **THEN** 每个模型显示名称、提供方与能力标签，刷新按钮可重新读取

### Requirement: 状态与可访问性
页面 SHALL 覆盖 loading、signedOut、error、unsupported、empty 五种状态。错误状态 MUST 提供重试；状态变化 MUST 伴随文案或 `aria-live`，不得只靠颜色区分；所有格子与切换控件 MUST 可通过键盘操作。

#### Scenario: 加载失败
- **WHEN** `bridge.usage()` 抛错
- **THEN** 页面显示「用量统计加载失败」与重试按钮，重试后重新请求

#### Scenario: 平台不支持
- **WHEN** `window.dshEnterpriseChat` 没有 `usage` 方法
- **THEN** 页面显示「请完全退出并重新启动客户端」提示，不显示空白区域

#### Scenario: 减少动态效果
- **WHEN** 系统启用 `prefers-reduced-motion`
- **THEN** 热力格过渡与悬停放大被关闭，不影响数据展示

### Requirement: 未实现动作不得渲染为可用
「分享」「编辑」「代理活动」属于 P2。P1 MUST NOT 渲染可点击但无行为的分享/编辑按钮，也 MUST NOT 渲染空的代理活动卡片。

#### Scenario: P1 页面
- **WHEN** 用户打开「账号与用量」
- **THEN** 页面不存在可点击但没有实际行为的分享或编辑按钮

### Requirement: 视觉与主题 token
页面 SHALL 使用组件 UI 的卡片与排版比例：内容列 `max-width: 680px` 居中；外层卡片 24px 圆角、1px 边框；封面 165px 高（窄窗口 120px）、`object-fit: cover`、`object-position: 50% 45%`；头像 80px 圆形并叠压封面下沿；指标块浅灰底、16px 圆角；热力格 13px、间距 4px、3px 圆角；词元卡 20px 圆角、图表高 200px。样式 MUST 只使用 `--dsw-alias-*` 语义 token；MUST NOT 新增 `--ds-*`、`body[data-ds-dark-theme]` 规则或硬编码主题色。

#### Scenario: 深色主题
- **WHEN** 客户端处于深色主题
- **THEN** 卡片背景、边框、文字与热力格使用深色 token，不出现白底或不可读文字

### Requirement: 数据契约保持隔离
页面 SHALL 继续通过现有 `window.dshEnterpriseChat.usage()` 获取摘要与存储，由主进程访问 `/api/v1/dsh/me/usage-summary` 与 `/api/v1/quota/effective`。`usage()` MUST 保持无参数、返回结构不变；MUST NOT 新增区间参数或改变用量字段。身份资料 MUST 通过单独、只读、可选的 profile 投影提供给渲染进程；该投影只能包含 `avatar`、`department_name` 等展示字段，MUST NOT 包含角色名称、角色 code 或任何凭据。用户名由 enterprise 插件通过 slot 的 `identity` prop 提供。渲染进程 MUST NOT 直接请求企业接口、MUST NOT 改变凭据存储或把 cookie 暴露给渲染进程。

#### Scenario: 单次桥接调用
- **WHEN** 页面加载用量
- **THEN** 只调用一次 `usage()`，主进程使用既有参数请求现有接口

#### Scenario: 数据结构未变
- **WHEN** 页面完成视觉改造后加载
- **THEN** `UsageMetrics` 仍只包含现有字段，页面不依赖任何新增字段
