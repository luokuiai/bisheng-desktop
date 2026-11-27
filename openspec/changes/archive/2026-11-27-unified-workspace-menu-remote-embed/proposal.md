# Proposal

## Why

新版工作台把原生侧栏隐藏后，只显示新版入口，原版「插件、知识空间、订阅、应用、工具与技能、发现广场」不再出现在统一菜单中；其中的远端页面打开时还会退出新版壳。用户需要在一个始终可见的扁平菜单里同时使用新老入口，并让远端原平台页面在主窗口内容区打开而不覆盖全局菜单。

## What Changes

- 将新版入口与原版六项合并为一个不分组、不替换的扁平菜单，按既定顺序连续展示。
- 菜单项支持三类目标：本地 React 页面、原生主面板（含现有 `plugins` 面板）、远端企业模块页面。
- 远端模块页面继续使用原平台 Web 页面，不重写知识空间、订阅、应用、工具与技能、发现广场。
- 远端页面在主窗口内容区承载，全局菜单栏保持挂载，页面视图边界不得覆盖菜单、顶部栏或系统窗口控件。
- 远端菜单项继续由当前企业账号下发的导航条目决定；未登录或无权限时不展示对应项。
- 「插件」继续打开现有插件管理主面板，不新增实现。

## Capabilities

### New Capabilities
- `desktop-workspace-navigation`: 定义新版工作台的统一扁平菜单、菜单项类型、顺序和权限驱动的远端入口。
- `desktop-remote-module-embed`: 定义远端企业模块在主窗口内容区嵌入显示、边界和全局菜单保持可见的行为。

### Modified Capabilities

## Impact

- `packages/dsh-desktop-client-ui/client.js`：统一导航状态、菜单项分发、远端模块场景与原生视图可见性。
- `packages/dsh-desktop-client-ui/workspace/static/workspace-chrome.js`、`packages/dsh-desktop-client-ui/workspace/components/workspace/navigation.ts`、`packages/dsh-desktop-client-ui/workspace/components/application/app-shell/app-shell.tsx`：扁平菜单数据源和图标/标题。
- `src/main/enterprise/chat-view.ts`、`src/shared/enterprise-chat-view.ts`：复用现有远端模块白名单与导航校验。
- `test/desktop-workspace-pages.test.mjs`、`test/enterprise-chat-view.test.ts` 及桌面导航/布局相关回归。
