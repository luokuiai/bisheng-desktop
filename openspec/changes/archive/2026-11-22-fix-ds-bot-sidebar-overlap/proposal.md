# 修复企业聊天遮挡 ds-bot 侧栏

## Why

安装 ds-bot 0.3.9 后，已登录的桌面客户端首次打开「聊天」时，企业聊天视图会盖住 Bot 侧栏，用户无法正常操作侧栏。ds-bot 折叠了原生侧栏，企业聊天仍按原生侧栏的宽度定位。

## What Changes

- 企业聊天按展开或折叠后的 Bot 侧栏实际占位确定左边界，首次滑入和拖动调整宽度时也会留出空间。
- 浮动抽屉打开期间，企业聊天让出显示区域。抽屉关闭后恢复当前对话。
- 侧栏关闭或移除后，企业聊天按宿主正常布局定位。远程设置保留自身的显示条件和边界。

## Capabilities

### New Capabilities

- `enterprise-chat-layout` 规定企业聊天与 Bot 侧栏共存时的布局和交互。

### Modified Capabilities

## Impact

- 桌面 UI 插件的聊天视图定位逻辑和 [桌面模式回归测试](../../../../test/desktop-modes-ui.test.mjs)。
- Electron 主进程继续通过现有的聊天视图 IPC 接收位置和可见状态。
