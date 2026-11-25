"""Verify that the published test installers match the selected platform assets."""

import argparse
import os
import re
from pathlib import Path

from signed_test_build import INSTALLERS, download_url, installer_paths, verify_download


def verify_test_downloads(directory: Path, target: str, version: str, repo_id: str) -> None:
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?", version):
        raise ValueError("signed_version must be a non-v semver")
    if target not in ("all", *INSTALLERS):
        raise ValueError("Invalid test target")
    for _, file in installer_paths(directory, target):
        url = download_url(repo_id, f"releases/test/{version}", file.name)
        verify_download(url, file.stat().st_size)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, required=True)
    parser.add_argument("--target", choices=["all", *INSTALLERS], required=True)
    parser.add_argument("--version", required=True)
    args = parser.parse_args()
    verify_test_downloads(args.directory, args.target, args.version, os.environ["MODELSCOPE_REPO_ID"])


if __name__ == "__main__":
    main()
