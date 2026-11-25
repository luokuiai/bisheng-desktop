"""Collect bounded git evidence for release notes and build summaries."""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass

STABLE_TAG_PATTERN = re.compile(r"^v\d+\.\d+\.\d+$")
LINK_PATTERN = re.compile(r"https?://|\[[^\]]+\]\([^)]+\)")
MAX_TAG_NOTE_LENGTH = 24_000
MAX_COMMIT_DETAILS_LENGTH = 24_000
MAX_CODE_DIFF_LENGTH = 48_000


@dataclass(frozen=True)
class ReleaseEvidence:
    release_tag: str
    previous_tag: str
    release_range: str
    tag_release_note: str
    commit_details: str
    diff_summary: str
    code_diff: str


def git_output(*args: str, default: str = "") -> str:
    try:
        return subprocess.check_output(
            ["git", *args],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return default


def read_annotated_tag_note(release_tag: str) -> str:
    object_type = git_output("cat-file", "-t", f"refs/tags/{release_tag}")
    if object_type != "tag":
        return f"Release {release_tag}"

    tag_release_note = git_output(
        "for-each-ref",
        f"refs/tags/{release_tag}",
        "--format=%(contents)",
    )
    return tag_release_note or f"Release {release_tag}"


def find_previous_tag(release_tag: str) -> str:
    ref = (
        release_tag
        if git_output("rev-parse", "--verify", f"refs/tags/{release_tag}", default="")
        or git_output("rev-parse", "--verify", f"{release_tag}^{{commit}}", default="")
        else "HEAD"
    )
    for sort in ("-creatordate", "-version:refname"):
        merged_tags = git_output("tag", "--merged", ref, f"--sort={sort}").splitlines()
        for tag in merged_tags:
            tag = tag.strip()
            if tag != release_tag and STABLE_TAG_PATTERN.fullmatch(tag):
                return tag
    return ""


def collect_range_evidence(release_tag: str, previous_tag: str) -> tuple[str, str, str, str]:
    ref = (
        release_tag
        if git_output("rev-parse", "--verify", f"refs/tags/{release_tag}", default="")
        or git_output("rev-parse", "--verify", f"{release_tag}^{{commit}}", default="")
        else "HEAD"
    )
    if previous_tag:
        release_range = f"{previous_tag}..{ref}"
        commit_details = git_output(
            "log",
            "--no-merges",
            "--pretty=format:---%nSubject: %s%nBody:%n%b",
            release_range,
        )
        diff_summary = git_output("diff", "--stat", release_range)
        code_diff = git_output(
            "diff",
            "--unified=1",
            "--no-ext-diff",
            release_range,
            "--",
            ".",
            ":(exclude)package-lock.json",
            ":(exclude)pnpm-lock.yaml",
        )
    else:
        release_range = release_tag
        commit_details = git_output(
            "log",
            "--no-merges",
            "--pretty=format:---%nSubject: %s%nBody:%n%b",
            "-n",
            "100",
            ref,
        )
        diff_summary = git_output("show", "--stat", "--format=", ref)
        code_diff = git_output(
            "show",
            "--format=",
            "--unified=1",
            "--no-ext-diff",
            ref,
            "--",
            ".",
            ":(exclude)package-lock.json",
            ":(exclude)pnpm-lock.yaml",
        )
    return release_range, commit_details, diff_summary, code_diff


def bound_code_diff(code_diff: str, limit: int = MAX_CODE_DIFF_LENGTH) -> str:
    chunks = re.findall(
        r"^diff --git .*?(?=^diff --git |\Z)",
        code_diff,
        re.MULTILINE | re.DOTALL,
    )
    if not chunks:
        return code_diff[:limit]

    marker = "\n... [file diff truncated for prompt budget]\n"
    per_file_budget = max(1, limit // len(chunks))
    excerpts = []
    for chunk in chunks:
        if len(chunk) <= per_file_budget:
            excerpts.append(chunk)
        elif per_file_budget <= len(marker):
            excerpts.append(chunk[:per_file_budget])
        else:
            excerpts.append(chunk[: per_file_budget - len(marker)] + marker)
    return "".join(excerpts)


def collect_release_evidence(release_tag: str) -> ReleaseEvidence:
    tag_release_note = read_annotated_tag_note(release_tag)
    previous_tag = find_previous_tag(release_tag)
    release_range, commit_details, diff_summary, code_diff = collect_range_evidence(
        release_tag,
        previous_tag,
    )
    return ReleaseEvidence(
        release_tag=release_tag,
        previous_tag=previous_tag,
        release_range=release_range,
        tag_release_note=tag_release_note[:MAX_TAG_NOTE_LENGTH],
        commit_details=commit_details[:MAX_COMMIT_DETAILS_LENGTH] or "No commit details collected.",
        diff_summary="\n".join(diff_summary.splitlines()[:200]) or "No diff statistics collected.",
        code_diff=bound_code_diff(code_diff) or "No code diff collected.",
    )
