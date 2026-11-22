# 修复企业版 ds-bot 首次发送与模块加载

## Why

企业版 ds-bot 0.3.9 替换原生模型选择器后，首次发送可能需要现场创建模型目录。BISHENG 的发送前校验未声明 `remote.session`，在这条路径上会抛出注入错误。同一份企业插件还会加载主入口和搜索入口，现有客户端模块发现会把它们误判为两个安装来源。

## What Changes

- 会话发送前可以在模型目录尚未初始化时读取会话模型服务，完成模型校验后提交消息。
- 同一物理安装目录的多个 Loader 入口共享一条客户端模块记录，记录随有效入口启停更新。
- 同名包来自不同安装目录时，客户端模块发现继续报告来源冲突。

## Capabilities

### New Capabilities

- `conversation-model-preflight` 规定模型目录尚未初始化时的发送前校验和提交行为。
- `client-plugin-discovery` 规定客户端模块如何识别安装来源并响应入口的生命周期。

### Modified Capabilities

## Impact

- 变更位于 Harness `0.2.1-rc.2` 的 [会话补丁](../../../../patches/@deepseek-ai+dsh-client-ui-conversation+0.2.1-rc.2.patch) 和 [客户端模块发现补丁](../../../../patches/@deepseek-ai+dsh-client-modules+0.2.1-rc.2.patch)。
- 回归覆盖实际 Cordis 注入、企业根组合、模块图及脚本响应。
