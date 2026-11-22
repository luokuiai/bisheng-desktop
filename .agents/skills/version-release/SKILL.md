---
name: version-release
description: Prepare, publish, continue, or inspect standard Office Agent releases from develop, including application versions, release branches, tags, artifacts, and merge-back. Use hotfix for production patches.
---

# Version Release

Select the requested operation from the conversation and repository state. Honor existing authorization without asking again. Preparation, version edits, and artifact inspection do not by themselves authorize production publication.

| Request | Scope |
| --- | --- |
| Prepare a release | Complete requested preparation; stop before merging into main or creating the release tag |
| Update versions only | Update applicable version metadata and lock files, then validate; commit or push only when authorized |
| Publish a release | Complete the required main merge, tag, pushes, artifact checks, and develop merge-back |
| Continue a release | Inspect existing progress and resume only the authorized remainder |
| Check status or artifacts | Inspect refs and workflow results without changing versions, refs, or publication state |

## Project Process

Read [Branches and tags and publishing isolation](references/release-process.md#branches-and-tags) and [Regular Release](references/release-process.md#regular-release) before preparation or publication. This reference preserves Office Agent's version selection, metadata, testing gates, image names and completion criteria. Use the [hotfix skill](../hotfix/SKILL.md) for production fixes and the [PR skill](../pr/SKILL.md) when a PR is requested.

- Preserve unrelated local changes. If a clean checkout is required, use an isolated worktree when needed and follow the [Git workflow](../../rules/git-workflow.md).
- Inspect current local and remote refs before continuing; do not recreate completed steps or move published tags to retry.
- Fetch tags before selecting a version. Follow the reference's stable production-tag rule when the user supplies no version; do not infer it from an unrelated highest tag.
- Update only root application versions, not dependencies or business data. Commit messages may be written in Chinese or English.
- Validate the affected version files and required release checks before publication. A version-only task does not require branch creation.

## Inspect Release

Match each check to the release's actual tag and commit. Read the current [CI workflow](../../../.github/workflows/ci.yml) and [Docker workflow](../../../.github/workflows/docker.yml) to determine expected checks and artifacts. Follow the publishing-isolation reference for ACR destinations. Do not treat successful artifact builds as proof of production deployment.

Inspection does not authorize edits, commits, merges, tags, pushes, reruns, or uploads. Report missing, pending, or failed checks and diagnose their cause; repair only within existing authorization.

## Completion Report

Report the operation completed, version, relevant commits and branches, tag target, remote synchronization, develop merge-back, checks and artifacts, and any unfinished step. Keep preparation and publication outcomes distinct.
