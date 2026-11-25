## ADDED Requirements

### Requirement: macOS 收起 DS Bot 侧栏时保留图标操作

支持 DS Bot 侧栏状态接口的 macOS 桌面客户端 SHALL 在展开侧栏和图标窄栏之间切换。

#### Scenario: 普通窗口和全屏下收起侧栏

- **WHEN** 用户在普通窗口或全屏下操作 DS Bot 侧栏开关
- **THEN** 收起状态保留可操作的图标窄栏，顶部依次显示返回、新建和搜索
- **AND** 普通窗口的开关位于系统窗口按钮旁，标题栏没有新建按钮
- **AND** 全屏的开关位于侧栏顶部
