---
name: hotfix
description: Prepare, publish, continue, or inspect Office Agent production hotfixes from the verified production tag, including integration branches, fix PRs, testing gates, versions, publication, and develop merge-back.
---

# Hotfix

Select the requested operation from the conversation and repository state. Honor existing authorization without asking again. Preparation, version edits, and artifact inspection do not by themselves authorize production publication.

| Request | Scope |
| --- | --- |
| Prepare a hotfix | Complete requested preparation; stop before merging into main or creating the release tag |
| Update hotfix versions only | Require integrated tests and frozen scope, update metadata and lock files, and validate; commit or push only when authorized |
| Publish a hotfix | Complete publication and develop merge-back after prerequisites pass |
| Continue a hotfix | Inspect completed steps and resume only the authorized remainder |
| Check status or artifacts | Inspect refs and workflow results without changing versions, refs, or publication state |

## Project Process

Read [Branches and tags and publishing isolation](../version-release/references/release-process.md#branches-and-tags) and [Production Hotfix](../version-release/references/release-process.md#production-hotfix) before preparation or publication. The same reference's [version metadata section](../version-release/references/release-process.md#3-update-version-metadata) defines Office Agent's application and lock-file version updates.

- Verify the actual production tag on updated remote main. Do not infer production from the highest version tag, current branch, or develop.
- Preserve unrelated local changes. Use an isolated worktree when a clean checkout is required, following the [Git workflow](../../rules/git-workflow.md).
- Use `hotfix-x.y.z` as the integration branch; implement fixes in `bugfix/*` branches and merge them into that integration branch using the [PR skill](../pr/SKILL.md). Do not start production hotfixes from develop.
- Run required focused, regression, release-build, and acceptance checks on the integrated hotfix. Freeze scope and pass these checks before bumping the version, merging into main, or tagging.
- A version-only request does not require a branch switch and does not bypass the testing gate. Commit messages may be written in Chinese or English.
- Resume existing authorized progress instead of recreating branches, commits, or tags. Do not move published tags to retry.
- Follow the reference's develop Snapshot comparison rule during merge-back so a newer development version is preserved while all hotfix code is merged.

## Inspect Hotfix

Match checks and artifacts to the hotfix's actual tag and commit. Read the current [CI workflow](../../../.github/workflows/ci.yml) and [Docker workflow](../../../.github/workflows/docker.yml), together with the publishing-isolation reference, to establish expected checks and ACR image names.

Inspection does not authorize edits, commits, merges, tags, pushes, reruns, or uploads. Report missing, pending, or failed checks and diagnose their cause; repair only within existing authorization. Successful builds do not prove production deployment.

## Completion Report

Report the operation completed, production base tag, version, hotfix branch, main merge commit and tag, develop merge-back, remote synchronization, checks and artifacts, and the next unfinished step. Verify publication against the reference's hotfix completion criteria.
