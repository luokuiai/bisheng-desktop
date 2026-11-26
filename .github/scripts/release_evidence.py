"""Collect bounded Git evidence for release and test-build summaries."""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass

STABLE_TAG_PATTERN = re.compile(r"^v\d+\.\d+\.\d+$")
MAX_COMMIT_DETAILS_LENGTH = 24_000
MAX_CODE_DIFF_LENGTH = 48_000


@dataclass(frozen=True)
class ReleaseEvidence:
    commit_details: str
    diff_summary: str
    code_diff: str


def git_output(*args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", *args],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except subprocess.CalledProcessError:
        return ""


def resolve_release_ref(release_tag: str) -> str:
    if git_output("rev-parse", "--verify", f"refs/tags/{release_tag}") or git_output(
        "rev-parse", "--verify", f"{release_tag}^{{commit}}"
    ):
        return release_tag
    return "HEAD"


def find_previous_stable_tag(release_tag: str, ref: str) -> str:
    for sort in ("-creatordate", "-version:refname"):
        for tag in git_output("tag", "--merged", ref, f"--sort={sort}").splitlines():
            if tag != release_tag and STABLE_TAG_PATTERN.fullmatch(tag):
                return tag
    return ""


def collect_range_evidence(ref: str, previous_tag: str) -> tuple[str, str, str]:
    log_args = ("--no-merges", "--pretty=format:---%nSubject: %s%nBody:%n%b")
    diff_args = ("--unified=1", "--no-ext-diff")
    paths = ("--", ".", ":(exclude)package-lock.json", ":(exclude)pnpm-lock.yaml")
    if previous_tag:
        release_range = f"{previous_tag}..{ref}"
        return (
            git_output("log", *log_args, release_range),
            git_output("diff", "--stat", release_range),
            git_output("diff", *diff_args, release_range, *paths),
        )
    return (
        git_output("log", *log_args, "-n", "100", ref),
        git_output("show", "--stat", "--format=", ref),
        git_output("show", "--format=", *diff_args, ref, *paths),
    )


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
    ref = resolve_release_ref(release_tag)
    previous_tag = find_previous_stable_tag(release_tag, ref)
    commit_details, diff_summary, code_diff = collect_range_evidence(ref, previous_tag)
    return ReleaseEvidence(
        commit_details=commit_details[:MAX_COMMIT_DETAILS_LENGTH] or "No commit details collected.",
        diff_summary="\n".join(diff_summary.splitlines()[:200]) or "No diff statistics collected.",
        code_diff=bound_code_diff(code_diff) or "No code diff collected.",
    )
