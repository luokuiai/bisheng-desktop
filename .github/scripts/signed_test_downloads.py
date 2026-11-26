#!/usr/bin/env python3
"""Verify public test installers and record the download and testing summary."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from signed_test_build import (
    TEST_VERSION_PATTERN,
    build_summary,
    build_test_changes,
    download_url,
    installer_paths,
    verify_download,
    write_summary,
)


def verify_and_summarize(directory: Path, target: str, version: str, repo_id: str) -> None:
    if not TEST_VERSION_PATTERN.fullmatch(version):
        raise ValueError("signed_version must be a non-v semver")
    prefix = f"releases/test/{version}"
    installers = installer_paths(directory, target)
    for _, file in installers:
        verify_download(download_url(repo_id, prefix, file.name), file.stat().st_size)

    server_url = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    repository_url = f"{server_url}/{repo}"
    run_id = os.environ.get("GITHUB_RUN_ID", "")
    run_url = f"{repository_url}/actions/runs/{run_id}" if repo and run_id else ""
    changes = ""
    try:
        changes = build_test_changes(repository_url)
    except Exception as error:
        print(f"Could not generate test changes from git history: {error}")
    if not changes:
        changes = "本次为测试安装包，macOS 使用 ad-hoc 签名，Windows 未签名，用于安装和功能验收，请手动下载安装。"
    write_summary(build_summary(version, installers, repo_id, prefix, run_url, changes))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, required=True)
    parser.add_argument("--target", choices=["all", "macos", "windows"], required=True)
    parser.add_argument("--version", required=True)
    args = parser.parse_args()
    verify_and_summarize(args.directory, args.target, args.version, os.environ["MODELSCOPE_REPO_ID"])


if __name__ == "__main__":
    main()
