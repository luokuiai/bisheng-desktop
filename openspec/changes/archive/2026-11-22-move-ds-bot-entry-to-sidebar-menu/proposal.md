# 将 DS Bot 入口移到桌面主菜单

## Why

用户在经典 Agent 模式下需要从左侧侧栏快速进入 DS Bot。现有入口位于账号区上方的页脚，用户需要先找到侧栏底部的「返回 DS Bot」。原型将多代理能力放在一级菜单，桌面客户端采用同一导航层级。

## What Changes

- 将 DS Bot 入口放在左侧主菜单的「新会话」下方、「插件」上方。中文名称为「多代理协作」，英文名称为「Multi-Agent Collaboration」。
- 兼容的企业版 DS Bot 启用后，入口在经典 Agent 模式中显示一次。点击沿用插件的模式切换，进入 DS Bot 界面。
- 桌面客户端识别到兼容的切换入口时接管其页脚位置。插件接口不匹配时，插件自行渲染原有入口。
- 进入 DS Bot 后，侧栏顶部从左至右显示「返回」按钮和「多代理协作」标题。点击返回经典 Agent 界面，并从左下角账号菜单移除「经典 Agent 模式」一项。
- macOS 和 Windows 使用同一个返回组件，沿用 DS Bot 侧栏的标题栏留白。Windows 的返回按钮可点击，侧栏收窄时仍可通过图标返回。
- 经典 Agent 侧栏按工作区分组时，隐藏确认属于 DS Bot 的默认团队工作区及组内会话。用户仍可通过「多代理协作」、会话搜索或平铺列表访问会话。

## Capabilities

### New Capabilities

- `desktop-ds-bot-navigation` 定义从桌面主菜单进入 DS Bot、从侧栏顶部返回经典 Agent 界面的行为及兼容回退。

### Modified Capabilities

## Impact

- 改动落在 BISHENG Desktop fork 的 [桌面 UI 插件](../../../../packages/dsh-desktop-client-ui/client.js) 和 [桌面模式回归](../../../../test/desktop-modes-ui.test.mjs)，复用当前 Harness 侧栏插槽。
- 入口和返回适配随 BISHENG 客户端发布，适配基线为企业版 DS Bot 0.3.9。DS Bot 继续从企业市场接收原包更新。新版插件的菜单结构无法精确识别时，按插件原有方式呈现账号菜单。
- 工作区隐藏沿用桌面端的侧栏集合插槽。由 Harness 宿主确认默认团队目录对应的工作区 ID，桌面界面据此隐藏分组。
