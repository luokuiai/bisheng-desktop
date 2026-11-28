---
name: update-build-install
description: 在本机 macOS 更新 DSH Desktop 当前分支、生成原生 DMG 和 ZIP，并把 LUOKUI-AI 安装到 /Applications。用户说“更新当前分支并打包安装”“拉最新代码，复制到程序目录”或调用 /update-build-install 时使用。
---

# 更新、打包并安装桌面应用

在仓库根目录执行。先读 [本地打包说明](../../../docs/release-runbook.md#native-packaging-runners)，确认最新 `package.json` 的 `package:mac:*`、产品名称和应用 ID。本流程使用正式应用身份，在本机打包，发布策略为 `never`。

## 1. 更新当前分支

用 `git branch --show-current`、`git status --short --branch` 和 `git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'` 确认分支、工作区及跟踪目标。记录更新前的 HEAD，再运行 `git pull --ff-only`，记录更新后的 HEAD 和上游提交。分叉、游离 HEAD 或缺少跟踪目标时，保留现场，向用户说明需选择的分支或整合方式。

保留用户未提交的修改。若有影响构建的本地改动，默认从更新后的 HEAD 建临时 detached worktree 构建，将最终产物保存在原仓库的 `dist/`。如果本地改动阻碍快进，告知冲突路径。不要自动 stash、reset 或切换用户分支。

## 2. 生成本机安装包

在构建工作区运行以下命令。临时 worktree 场景将 `artifact_root` 指向原仓库的绝对 `dist` 路径。每次新建输出目录，即使版本号相同也能识别本次产物。

```sh
set -e
arch=$(node -p 'process.arch')
artifact_root="$PWD/dist"
mkdir -p "$artifact_root"
output=$(mktemp -d "$artifact_root/$(git rev-parse --short HEAD).XXXXXX")
printf '本次产物目录 %s\n' "$output"
npm ci --prefer-offline --no-audit --no-fund
npm run typecheck
npm run "package:mac:$arch" -- --config.directories.output="$output" --config.electronDist=node_modules/electron/dist
```

确认本机为原生 ARM64 或 Intel macOS，`npm ci` 的 postinstall 完整成功，当前版本的所有补丁均已应用。仓库的原生打包命令会执行 `verify-target` 和打包后运行时检查。Electron 下载超时时可以使用可信镜像重试，保留安装器的校验和验证。根据更新的文件运行对应回归测试。任何打包错误须排查后重新完成该阶段。

## 3. 核验并安装

从本次 `output` 取 `luokui-ai-mac-$arch.dmg` 和 `.zip`，按 `latest-mac.yml` 检查两者的版本、大小和 SHA-512。用 `hdiutil attach -readonly -nobrowse -verify -mountpoint "$mount_dir" "$dmg"` 将 DMG 挂载到新建的临时空目录，在完成或失败时卸载并清理挂载点。核对镜像根目录中的 `LUOKUI-AI.app` 与本次构建的 `.app`，两者的 `Contents/Resources/app.asar` 和 `Contents/_CodeSignature/CodeResources` 应一致。

从构建工作区调用本 skill 附带的安装脚本。`skill_dir` 是这份 SKILL.md **实际所在目录**的绝对路径（可能在原仓库中）。

```sh
python3 -I "$skill_dir/scripts/install-app.py" "$mount_dir/LUOKUI-AI.app"
```

安装脚本从当前 `package.json` 核对产品身份及版本，将新应用复制到目标卷的临时目录、校验签名，再原子替换 `/Applications` 下的同名应用。若目标应用正在运行，保留已生成的 DMG，等用户保存工作并退出；用户明确允许时可以请求应用正常退出。退出后继续安装同一份产物。若同名目标属于另一应用或渠道，报告冲突，请用户决定保留位置。

最后在构建工作区用已安装应用做隔离的 Harness 冒烟验证：

```sh
node -e 'const {build} = require("./package.json"); require("./scripts/verify-packaged-harness.cjs").verifyPackagedHarness({electronPlatformName: "darwin", appOutDir: "/Applications", packager: {appInfo: {productFilename: build.productName}}}).catch(error => { console.error(error.message); process.exitCode = 1 })'
```

交付时给出当前分支、提交、版本、架构、DMG 和已安装应用的路径，以及实际通过的检查。说明应用是否已替换、是否启动过桌面界面。
