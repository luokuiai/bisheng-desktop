#!/usr/bin/env python3
"""Upload signed test installers and summarize verified downloads."""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import time
import urllib.request
from pathlib import Path
from urllib.parse import quote

from release_evidence import bound_code_diff
from test_change_summary import summarize_changes

TEST_VERSION_PATTERN = re.compile(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?")

INSTALLERS = {
    "macos": [
        ("macOS Apple Silicon", "luokui-ai-mac-arm64.dmg"),
        ("macOS Intel", "luokui-ai-mac-x64.dmg"),
    ],
    "windows": [("Windows x64", "luokui-ai-windows-x64-setup.exe")],
}


def installer_paths(directory: Path, target: str) -> list[tuple[str, Path]]:
    if target not in ("all", *INSTALLERS):
        raise ValueError("Invalid test target")
    platforms = ["macos", "windows"] if target == "all" else [target]
    installers = [(label, directory / name) for platform in platforms for label, name in INSTALLERS[platform]]
    for _, file in installers:
        if not file.is_file() or file.stat().st_size == 0:
            raise ValueError(f"Missing or empty signed installer: {file.name}")
    return installers


def test_prefix(version: str, run_id: str) -> str:
    if not TEST_VERSION_PATTERN.fullmatch(version):
        raise ValueError("signed_version must be a non-v semver")
    if not re.fullmatch(r"[1-9]\d*", run_id):
        raise ValueError("run_id must be a positive integer")
    return f"test/{version}/{run_id}"


def download_url(repo_id: str, prefix: str, name: str) -> str:
    if not re.fullmatch(r"[\w.-]+/[\w.-]+", repo_id) or any(
        part in (".", "..") for part in repo_id.split("/")
    ):
        raise ValueError("Invalid ModelScope repository ID")
    return f"https://modelscope.cn/models/{repo_id}/resolve/master/{quote(prefix + '/' + name, safe='/')}"


def verify_download(url: str, expected_size: int) -> None:
    # Read only one byte: checking a large installer must not download it again.
    request = urllib.request.Request(url, headers={"Range": "bytes=0-0"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                content_range = response.headers.get("Content-Range")
                # ModelScope's CDN can return a valid range with HTTP 200.
                if content_range:
                    valid = response.status in (200, 206) and content_range == f"bytes 0-0/{expected_size}"
                else:
                    valid = response.status == 200 and response.headers.get("Content-Length") == str(expected_size)
                if not valid or len(response.read(1)) != 1:
                    raise ValueError(f"Unexpected download response: status={response.status}, range={content_range}, length={response.headers.get('Content-Length')}")
            return
        except Exception as error:
            if attempt == 5:
                raise RuntimeError(f"ModelScope test installer is not publicly downloadable: {url}") from error
            time.sleep(10)


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], text=True, encoding="utf-8").strip()


def build_test_changes(repository_url: str) -> str:
    if git("rev-parse", "--is-shallow-repository") == "true":
        raise ValueError("Signed test changelog requires complete git history and tags")
    head = git("rev-parse", "HEAD")
    release_tag = re.compile(r"[vV]?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?")
    tags = [tag for tag in git("tag", "--merged", head).splitlines() if release_tag.fullmatch(tag)]
    # When dispatched on a tag itself, compare that release to the preceding tag.
    earlier = [tag for tag in tags if git("rev-parse", f"refs/tags/{tag}^{{commit}}") != head]
    previous = git("describe", "--tags", "--abbrev=0", *[f"--match={tag}" for tag in earlier], head) if earlier else ""
    revision = f"{previous}..{head}" if previous else head
    raw = git("log", "--no-merges", "--reverse", "--format=%s%n%b", revision)
    # An empty tree includes all current code for a first build without a baseline tag.
    baseline = previous or subprocess.check_output(
        ["git", "hash-object", "-t", "tree", "--stdin"], input="", text=True,
    ).strip()
    diff_range = f"{baseline}..{head}"
    paths = ("--", ".", ":(exclude)package-lock.json", ":(exclude)pnpm-lock.yaml")
    statistics = git("diff", "--stat", diff_range, *paths)
    code = bound_code_diff(git("diff", "--no-ext-diff", "--unified=1", diff_range, *paths))
    return summarize_changes(raw, statistics, code)


TEST_SUGGESTIONS = """\
**测试建议**
1. 安装与升级：检查全新安装、覆盖升级和启动。
2. 对话与工具：检查流式输出、工具调用和思考折叠。
3. 变更回归：逐项验证上述功能和问题修复。
4. 状态恢复：检查设置、会话在重启和异常退出后的恢复。\
"""


def build_summary(version: str, installers: list[tuple[str, Path]], repo_id: str, prefix: str, run_url: str, changes: str = "") -> str:
    links = "\n".join(f"- [{label}]({download_url(repo_id, prefix, file.name)})" for label, file in installers)
    if len(changes) > 9000:
        changes = changes[:8500].rsplit("\n", 1)[0] + "\n\n变更较多，已截断展示。"
    details = f"\n\n{changes}" if changes else ""
    run_link = f"\n\n[查看 CI 构建详情]({run_url})" if run_url else ""
    return (
        f"**LUOKUI-AI {version} 测试打包完成**\n\n"
        f"**ModelScope 下载地址**\n{links}"
        + details
        + f"\n\n{TEST_SUGGESTIONS}"
        + run_link
    )


def write_summary(notes: str) -> None:
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as stream:
            stream.write(notes + "\n")
    else:
        print(notes)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, required=True)
    parser.add_argument("--target", choices=["all", "macos", "windows"], required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--run-id", required=True)
    args = parser.parse_args()
    prefix = test_prefix(args.version, args.run_id)
    repo_id = os.environ.get("MODELSCOPE_REPO_ID", "alexyaojin/bisheng-work")
    token = os.environ["MODELSCOPE_TOKEN"]
    if not token:
        raise ValueError("ModelScope token is required for signed test builds")
    installers = installer_paths(args.directory, args.target)
    repository_url = f"{os.environ['GITHUB_SERVER_URL']}/{os.environ['GITHUB_REPOSITORY']}"
    changes = build_test_changes(repository_url)
    changes_file = args.directory / "test-changes.md"
    changes_file.write_text(f"# LUOKUI-AI {args.version} 提测说明\n\n{changes}\n", encoding="utf-8")
    # Import the SDK only for uploads so download verification can run without it.
    from modelscope.hub.api import HubApi

    api = HubApi()
    for _, file in [*installers, ("提测说明", changes_file)]:
        url = download_url(repo_id, prefix, file.name)
        api.upload_file(
            repo_id=repo_id,
            path_or_fileobj=str(file),
            path_in_repo=f"{prefix}/{file.name}",
            commit_message=f"Signed test build {args.version} run {args.run_id}",
            token=token,
        )
        verify_download(url, file.stat().st_size)
        print(f"Verified signed test installer: {file.name}")
    run_url = f"{os.environ['GITHUB_SERVER_URL']}/{os.environ['GITHUB_REPOSITORY']}/actions/runs/{args.run_id}"
    write_summary(build_summary(args.version, installers, repo_id, prefix, run_url, changes))


if __name__ == "__main__":
    main()
