# Design

## Context

新版工作台由 `workspace/static/workspace-chrome.js` 渲染固定菜单，`workspace-chrome.css` 在 `body[data-dsh-workspace-scene]` 下隐藏 Harness 原生侧栏。现有本地入口由 `WorkspaceView` 渲染 React 页面，`/ai-chat`、`/ai-image-generation`、`/project-board` 等入口通过 `workspacePanels` 选择现有主面板。

原版企业入口尚未进入新版菜单。远端模块页面已是独立 `WebContentsView`，由 `EnterpriseChatView` 使用企业隔离会话加载；当前 `openPage()` 会清空 `workspacePath`，导致新版壳退出。插件页已注册为 Harness `main` 面板 `plugins`，无需重写。

## Goals / Non-Goals

**Goals:**

- 用一个不分组、不替换的扁平菜单展示全部新老入口。
- 让本地页面、原生面板、远端模块三类目标都在主窗口内容区打开。
- 远端模块显示期间保持同一套全局菜单、顶部栏和窗口控件边界。
- 复用现有远端页面、账号权限、路由白名单和应用宿主能力。

**Non-Goals:**

- 重写知识空间、订阅、应用、工具与技能、发现广场的页面或后端接口。
- 重写插件管理页面。
- 改变远端模块的账号、ACL 或数据权限规则。
- 恢复旧版菜单的拖拽排序、前 5 项 +「更多」溢出等交互。

## Decisions

### 1. 单一扁平目的地注册表

新增一份统一目的地数据，菜单渲染只消费这份数据：

```text
{ id, label, icon, kind: 'local' | 'panel' | 'remote', route?, panelId?, moduleId? }
```

默认顺序固定为新版六项后接原版六项。`DirectoryNav`、`/chat` 场景的 `ChatNav` 和总览卡片从同一注册表获取入口，避免多套菜单各自维护。

远端项不写死为始终可见：渲染时与 `state.navigation.entries` 合并，只保留当前账号实际下发的模块。这样既保持扁平列表，也保留账号权限约束。

### 2. 原生面板复用现有 `main` slot

`插件` 映射到现有面板 `plugins`，`代码工作台`、`图像生成`、`任务看板` 继续映射现有面板 id。打开方式为 `ctx.layout.selectPanel(panelId)`；面板仍由 Harness 主内容列渲染，因此不会出现第二套全局菜单，也不会覆盖新版壳。

不新增插件页面，不复制插件安装/启停/配置逻辑。

### 3. 远端模块使用独立内容场景

在导航状态中增加远端模块标识，例如：

```text
workspacePath = '/knowledge'
remotePageId  = 'knowledge'
mode          = 'chat'
pageId        = 'knowledge'
```

`WorkspaceChrome` 继续在 `workspacePath` 存在时挂载。`DesktopModes` 在远端场景下：

- 隐藏本地 work 面板；
- 保留一个内容区占位节点作为远端视图的 bounds 来源；
- 调用现有 `dshEnterpriseChat.openPage(moduleId)`；
- 通过 `bridge.present()` 把原生视图限制在内容区矩形内。

相比复用隐藏的 chat 面板作 bounds，显式内容区占位更容易保证 0×0、菜单覆盖和切换竞态不会出现。

### 4. 三类目标只替换内容区

统一分发动作：

```text
local  -> navigate(route) / WorkspaceView
panel  -> selectPanel(panelId) + workspacePath
remote -> openRemoteModule(moduleId) + workspacePath + remotePageId
```

切换过程中不调用 `openDesktop()`、不清空 `workspacePath`、不重新显示原生侧栏。`body[data-dsh-workspace-scene]` 在三种场景下保持存在。

### 5. 远端边界由内容区计算

原生 `WebContentsView` 永远绘制在 DOM 之上，因此不能依赖 CSS z-index。远端视图 bounds 必须由内容区占位节点的实际矩形计算，而不是窗口矩形；工具栏高度、左侧菜单宽度、紧凑模式和右侧栏变化都触发重算。

## Risks / Trade-offs

- [WebContentsView 覆盖全局菜单] → 使用内容区占位矩形作为唯一边界来源，禁止窗口全宽 bounds；增加窗口缩放、菜单折叠和恢复测试。
- [隐藏面板导致 bounds 为 0×0] → 远端场景使用独立可见占位内容区，不依赖隐藏的 chat/work 面板。
- [两套导航渲染不一致] → 扁平目的地注册表作为唯一数据源，`DirectoryNav` 与 `ChatNav` 共同消费。
- [账号切换后残留旧页面] → 退出或切换账号时清除 `remotePageId`、隐藏远端视图并移除旧 entries。
- [应用中心托管应用边界回归] → 复用现有 `HostedAppView` 内容区边界，并覆盖应用打开、返回和窗口缩放。
- [本地页面自带侧栏与新菜单冲突] → 保持现有 `workspaceScene` 规则；包含内置侧栏的页面仍在内容区渲染，全局菜单的可见性按场景单独验证。

## Migration Plan

1. 先建立目的地注册表和统一分发动作，保持现有页面行为不变。
2. 接入 `plugins` 原生面板，验证原生面板与新版菜单共存。
3. 增加远端模块场景与内容区占位，接入五个远端入口。
4. 处理账号切换、应用宿主、主题/locale、窗口缩放和紧凑菜单。
5. 按仓库要求运行相关桌面导航、企业视图和真实主窗口验收。
