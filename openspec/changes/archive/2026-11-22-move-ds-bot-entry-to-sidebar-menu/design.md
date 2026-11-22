# DS Bot 主菜单入口设计

## Context

企业版 DS Bot 0.3.9 将 `bot-return` 注册到 Harness 的 `sidebar.footer.action`，通过同一注册提供当前模式和 `setSurface('bot')`。BISHENG Desktop 的 `sidebar.primaryNavigation` 已提供可复用的菜单行，位置在「新会话」之后、工作区之前。

进入 Bot 模式后，`TeamSidebar` 直接渲染「DS Bot」标题及侧栏，`AccountLauncher` 直接渲染账号菜单与「经典 Agent 模式」项。两个位置目前均由 DS Bot 插件管理。

## Decisions

1. **由桌面 UI 插件渲染菜单行。** 在 `sidebar.primaryNavigation` 中调用现有 `renderAction`，把入口放到「插件」前。中文和英文文案经 Harness locale 服务读取，可见文字和无障碍名称使用同一个值。
2. **由 DS Bot 管理模式。** 订阅兼容 `bot-return` 注册提供的 `surface`。在 `agent` 模式显示入口，点击调用该注册提供的 `setSurface('bot')`。菜单随插件状态变化更新。
3. **按 ID 接管页脚。** 主菜单入口挂载期间，在 `sidebar.footer.action` 以更高优先级接管 `bot-return`。菜单入口卸载时释放该注册。页脚账号等其他入口由各自的注册继续渲染。
4. **由客户端在 Bot 侧栏中呈现返回按钮。** 通过 `shell.overlay` 挂载宿主组件，在可见的 DS Bot 标题区或窄栏顶部使用 React portal 渲染，复用 `setSurface('agent')`。按钮进入现有侧栏文档流，沿用 Windows 标题栏和 macOS 原生窗口控件的留白，并声明可点击区域。窄栏呈现图标和无障碍名称。
5. **按已验证的结构隐藏账号菜单旧项。** 顶部返回可用时，以 DS Bot 0.3.9 的账号菜单、切换图标和当前语言标签共同识别旧项。适配仅处理唯一匹配的按钮和紧邻它的分隔线。隐藏期间禁用该按钮，使 DS Bot 的方向键导航跳过它。侧栏或菜单卸载、目标变化和宿主组件卸载时释放观察并撤销隐藏。未识别的账号菜单由 DS Bot 自行呈现。
6. **让返回按钮位于标题左侧。** 识别到 0.3.9 的原始标题后，由宿主在返回按钮右侧渲染「多代理协作」，并通过作用域样式隐藏原始标题。菜单和标题使用同一个翻译键。标题结构失配时显示插件原始标题。
7. **同时核对团队 ID 和默认目录。** 从 `bot-return` 的 roster 快照读取当前团队工作区 ID。通过经过 Harness 认证的桌面只读接口，使用 `workspaceRegistry.resolveByPath` 查询 `$DSH_HOME/bot/workspace` 对应的 ID。两个 ID 一致时可以隐藏该组。工作区更名按原 ID 生效。插件卸载、目录自定义、团队切换或查询失败时保留未确认的工作区。客户端只接收工作区 ID，路径规范化由 Harness 宿主完成。
8. **在侧栏的分组渲染阶段隐藏。** 扩展现有 `sidebar.workspaces.collection.projects`，允许桌面集合传入可选的隐藏工作区 ID。隐藏该组及组内会话，并把可见的子工作区提升到上一层。保留原分组数据参与会话归属和排序，避免组内会话出现在未分组对话里。搜索、平铺、当前会话和目录选择继续使用原始数据。

## Risks / Trade-offs

- 兼容读取依赖 DS Bot 0.3.9 的注册形状。缺少模式订阅或切换动作时，桌面 UI 让插件自行渲染页脚。升级 DS Bot 或 Harness 时，以菜单位置、入口唯一性、实际模式切换和回退行为验收。
- 适配基于原包 0.3.9 的模式和 DOM 契约。更新 DS Bot 后复验顶部返回、菜单键盘操作和回退。插件提供正式的模式切换与导航扩展接口后迁移到正式接口。
- Windows 验证覆盖普通窗口、最大化和常见显示缩放下的标题栏点击区域、图标栏以及菜单键盘导航。原生 Windows 验收与跨平台 renderer 回归分别记录。
- 隐藏逻辑使用 Harness 0.2.1-rc.2 的工作区登记和侧栏集合插槽。升级时复验链路，尤其是工作区重建、普通项目复用和搜索。上游提供可按工作区 ID 跳过分组的渲染选项后迁移。
