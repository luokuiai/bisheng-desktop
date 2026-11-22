# 桌面 DS Bot 导航

## ADDED Requirements

### Requirement: 经典 Agent 模式提供 DS Bot 一级菜单入口

BISHENG 桌面客户端 SHALL 在已启用兼容的企业版 DS Bot 且处于经典 Agent 模式时，将 DS Bot 入口显示在左侧主菜单的「新会话」下方、「插件」上方，同一入口只显示一次。

#### Scenario: 在中文界面打开经典 Agent 模式

- **WHEN** 已启用兼容的 DS Bot 插件且桌面界面处于经典 Agent 模式
- **AND** 客户端语言为中文
- **THEN** 「新会话」下方、「插件」上方显示「多代理协作」菜单项
- **AND** 菜单项的无障碍名称为「多代理协作」
- **AND** 页脚中的「返回 DS Bot」入口隐藏

#### Scenario: 点击入口切回 DS Bot

- **WHEN** 用户点击「多代理协作」
- **THEN** 客户端通过 DS Bot 的模式切换动作进入 Bot 模式
- **AND** 经典 Agent 模式的菜单入口随模式切换消失

#### Scenario: 插件不可用

- **WHEN** DS Bot 未安装、已禁用或已卸载
- **THEN** 左侧主菜单中隐藏 DS Bot 入口

### Requirement: 兼容条件缺失时保留插件的页脚入口

BISHENG 桌面客户端 SHALL 仅在识别到兼容的插件注册并由主菜单提供可用入口时接管 `bot-return` 页脚位置。

#### Scenario: 插件注册接口变化

- **WHEN** 启用的 DS Bot 仍注册页脚入口，但其模式订阅或切换接口无法被当前客户端识别
- **THEN** 页脚入口仍由 DS Bot 插件渲染
- **AND** 客户端隐藏主菜单中的 DS Bot 入口

### Requirement: Bot 模式从侧栏顶部返回经典 Agent

支持顶部返回的 BISHENG 桌面客户端 SHALL 在 DS Bot 展开的侧栏顶部从左至右显示「返回」按钮和「多代理协作」标题，并将原「经典 Agent 模式」切换项从左下角账号菜单移除。

#### Scenario: 显示新的返回位置

- **WHEN** 用户通过「多代理协作」进入 DS Bot 界面
- **THEN** 侧栏顶部从左至右显示「返回」按钮和「多代理协作」标题
- **AND** 左下角账号菜单中没有「经典 Agent 模式」切换项

#### Scenario: 在 DS Bot 中返回

- **WHEN** 用户点击「返回」
- **THEN** 客户端切换回经典 Agent 界面，并恢复显示左侧「多代理协作」入口

#### Scenario: 收窄 DS Bot 侧栏

- **WHEN** 用户将 DS Bot 侧栏收窄为图标栏
- **THEN** 侧栏顶部仍可通过带有无障碍名称的图标按钮返回经典 Agent 界面

#### Scenario: 在 Windows 标题栏下操作返回按钮

- **WHEN** Windows 客户端在普通窗口或最大化状态下显示 DS Bot 侧栏
- **THEN** 返回按钮位于标题栏拖动区下方，并可通过鼠标或键盘激活

#### Scenario: 无法安全替代旧入口

- **WHEN** 顶部返回不可用，或客户端无法唯一识别账号菜单中的旧切换项
- **THEN** 客户端保留 DS Bot 原有的账号菜单行为

### Requirement: 经典 Agent 侧栏隐藏默认团队工作区分组

BISHENG 桌面客户端 SHALL 仅在经典 Agent 的工作区分组视图中，将 DS Bot 当前团队工作区 ID 与 Harness 默认团队目录的登记 ID 核对一致后，隐藏该分组及其组内会话行。

#### Scenario: 隐藏已确认的默认团队工作区

- **WHEN** DS Bot 插件启用，且当前团队工作区对应 DS Bot 默认团队目录
- **THEN** 侧栏省略该分组和组内会话，包括显示名称已更改的情况
- **AND** 组内会话不出现在未分组的「对话」中
- **AND** 可见的子工作区仍可从工作区树进入

#### Scenario: 访问保留的团队会话

- **WHEN** 用户切换到平铺或者搜索会话，或通过「多代理协作」进入 DS Bot
- **THEN** 已有会话仍按对应入口的既有规则可访问
- **AND** 已打开的会话、工作区和其中的文件保留

#### Scenario: 默认团队工作区身份无法确认

- **WHEN** DS Bot 未启用、使用自定义工作区、复用普通工作区，或当前工作区 ID 无法确认
- **THEN** 侧栏按原规则显示工作区分组
