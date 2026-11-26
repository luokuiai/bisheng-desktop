# LUOKUI-AI 私有仓库开发说明

## 定位与基线

LUOKUI-AI 基于 DSH Desktop，面向个人、团队及企业工作场景，承载非开源扩展。继续复用 Harness runtime 和 Web UI，遵循仓库 AGENTS.md 及现有模块边界。

- 私有仓库：`https://github.com/dataelement/bisheng-work`
- 上游仓库：`https://github.com/dataelement/dsh-desktop`
- 初始化基线：上游 main，`a23788a7817b4f3980e3c4aa96ed48e24e653e74`
- 保留该基线的完整祖先历史；不导入上游其他分支、发布标签和 Release 资产。

## 本地协作与上游同步

新克隆后执行一次以下配置。本地 remote 配置不会随 Git 提交传播：

```bash
git clone https://github.com/dataelement/bisheng-work.git
cd bisheng-work
git remote add upstream https://github.com/dataelement/dsh-desktop.git
git config remote.pushDefault origin
git config remote.upstream.pushurl DISABLED
git config push.default simple
```

origin 用于私有开发和提交；upstream 仅用于获取上游变更。需要同步时，在工作区干净的前提下创建独立分支：

```bash
git switch main
git pull --ff-only origin main
git fetch upstream main
git switch -c codex/sync-upstream-YYYYMMDD
git merge upstream/main
```

将 YYYYMMDD 替换为同步日期；解决冲突后按 AGENTS.md 执行相关回归、类型检查、构建及完整测试，再推送该分支到 origin 并创建私有 PR。不要向公开上游提交包含私有功能的分支或 PR。公共修复若需贡献上游，应在公共仓库单独整理。

## 许可与私有功能

保留上游 LICENSE、版权声明及第三方包自身的许可文件。私有仓库的可见性设置不改变已有代码的许可。

新增私有模块应在引入时明确其授权范围、版权声明及与上游代码的边界；不要把整个上游实现重新标记为专有代码，也不要默认让新增私有模块继承根目录 MIT 许可。正式分发前需完成依赖及随包声明核对。

## 当前状态与发布前工作

应用名称为 LUOKUI-AI，Windows 可执行文件为 `LUOKUI-AI.exe`，发布资产使用 `luokui-ai` 文件名前缀。两类构建均采用 macOS ad-hoc 签名和 Windows 未签名安装包。生产包通过 `BISHENG_UPDATE_URL` 设置更新地址，留空时关闭在线更新。正式版更新资产导出至 Actions artifacts，由部署方上传到企业更新目录。测试和预发布渠道仍使用 ModelScope。安装标识及 Profile 兼容策略见 [发布手册](release-runbook.md)。

企业网页使用 `luokuiai://login?server=https%3A%2F%2Fplatform.example.com` 唤起正式版，使用 `luokuiai-dev://login?server=https%3A%2F%2Fplatform.example.com` 唤起开发版。`server` 为经 URL 编码的平台地址，网页端应同步更新。

初始化时曾关闭 Actions；当前构建及发布配置以 `package.json` 和 `.github/workflows/release.yml` 为准。发布前核对以下隔离边界和组织级 secrets 的访问范围：

- 产品名称、图标、应用 ID、安装路径与 URL 协议。
- userData、DSH_HOME、Profile、日志和凭据存储边界，以及已有用户数据的迁移策略。
- 自动更新、回滚索引、下载地址、GitHub Release 及 ModelScope 发布目标。
- 独立签名、发布凭据及对应 workflow 权限。
- 产品文档、支持入口、隐私说明及新增模块的许可范围。

在完成隔离前，不应将沿用上游身份和更新配置的构建作为 LUOKUI-AI 正式安装包分发。开发调试使用临时目录或独立开发 Profile，避免影响现有 DSH Desktop 数据。
