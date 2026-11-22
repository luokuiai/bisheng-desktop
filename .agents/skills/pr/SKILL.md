---
name: pr
description: Manage pull requests in this repository. Use for creating PRs, delivering code updates, amending and pushing, editing PR titles or descriptions, inspecting checks and reviews, merging PRs, and requested post-merge branch updates.
---

# PR

Select the operation requested by the user before executing a workflow. For combined requests, perform only the requested stages in order. Honor existing authorization without asking again; creating or updating a PR does not authorize merging it.

Resolve an ambiguous "update the PR" from the task context and actual changes. If the intended operation remains materially unclear, ask before mutating anything.

## Project Rules

Use the rules below for commits, branch names, and PR content. Read the [PR template](../../../.github/pull_request_template.md) when writing PR titles or descriptions.

## Choose the Operation

| Request | Workflow |
| --- | --- |
| Commit, amend, push, open a PR, or deliver changes to a PR | Code Delivery, stopping at the requested stage |
| Edit only a PR title or description | Edit PR Metadata |
| Check PR status, reviews, CI, or mergeability | Inspect PR |
| Merge a PR | Merge PR |
| Switch back and pull after merging | Post-Merge Follow-Up |

## Commit Rules

- Never commit directly to `main` or `develop`. Create a working branch and merge changes through a reviewed pull request. Release exceptions require specific authorization and a separately agreed procedure.
- Git commit subjects, bodies, and trailers may be written in Chinese or English; follow the user's preference.
- Keep commits focused on independently reviewable changes. Do not rewrite shared history or discard unrelated changes without explicit authorization.
- Each commit should represent one logical change. Do not mix unrelated features in a single commit.

## Branch Naming

- Working branch names MUST use lowercase letters, digits, slash (`/`), and
  hyphen (`-`) only.
- Working branches MUST follow: `<type>/<short-description>` (example:
  `feature/remove-business-file-relation-version`).
- `short-description` MUST be concise kebab-case and SHOULD be 3-8 words.
- Required supported branch `type` values:
  - `feature`: new features or behavior changes.
  - `update`: non-breaking updates, dependency/config/structure adjustments.
- Additional allowed branch `type` values:
  - `bugfix`: defect fixes, including fixes based on a versioned hotfix branch.
  - `refactor`: code restructuring without behavior change.
  - `chore`: maintenance tasks not directly affecting business behavior.
  - `docs`: documentation-only changes.
  - `release`: release preparation branches.
- Version integration branches are exceptions to the working-branch format:
  - `release-x.y.z`: a normal release branch created from `develop`.
  - `hotfix-x.y.z`: a production-hotfix integration branch created from the
    current production tag. Individual fixes MUST branch from it as
    `bugfix/<short-description>` and merge back into it.
- Disallowed examples: `Feature/Test`, `fix_xxx`, `mybranch`, `feature/`.
- Recommended examples: `feature/add-tenant-audit-fill`,
  `bugfix/fix-file-delete-null-check`, `hotfix-1.0.6`,
  `update/align-flyway-migration-naming`.

## PR Format

- PR titles and descriptions MUST be written in English.
- PR `summary` MUST focus on the actual change and reviewer impact: what changed, why it changed, and what surface is affected.
- Keep the writing concise and specific. Prefer change facts and impact over implementation process or generic statements.
- PR descriptions MUST follow `.github/pull_request_template.md` and contain only `## Summary` and `## Changes`. Use one short summary paragraph and 3-7 concrete change bullets. Do not include testing or validation content in PR titles or descriptions. Do not expose credentials, private test accounts, or raw sensitive logs.

## Validation

Apply the project [build and test requirements](../../rules/build-test-development.md) and [Git workflow](../../rules/git-workflow.md) when delivering code.

- Complete the required checks for the affected services before opening or updating a PR. Follow the Git workflow for the full-suite decision after rebasing; documentation-only changes skip the full suite.
- Reuse applicable verification results when the relevant source is unchanged. Run broader suites only when the change or failures justify them, or when explicitly requested. Required CI checks still apply before merging.

## Code Delivery

1. Inspect the current branch, worktree, staging area, upstream, and existing PR. Include all user-authorized changes, including configuration files; do not silently exclude a profile such as `application-vc.properties` merely because it is local configuration. Review configuration diffs for credentials before publication. Preserve changes outside the authorized scope and untracked files.
2. Determine the base branch from the user request, existing PR, or release task context. Ask only when it cannot be determined. Do not start a hotfix or release process on your own.
3. When preparing to publish a new PR or changed PR head, run `rtk git fetch origin`. For an existing remote working branch, inspect its commits and record its current commit before rewriting history. Incorporate remote changes rather than overwriting commits missing locally.
4. Stage explicit task paths and commit or amend according to project rules for commit messages and commit organization. Preserve unrelated local changes, using an isolated worktree when necessary. Before publishing a new PR or changed PR head, rebase onto the latest target branch:

   ```bash
   rtk git rebase origin/<base>
   rtk git merge-base --is-ancestor origin/<base> HEAD
   ```

   For a normal PR into develop, use `origin/develop`. For a different PR base, use that branch. Resolve conflicts while preserving intended changes, continue the rebase, and inspect the result. Ask when resolving a conflict requires an unclear product decision; do not silently drop changes.

5. Before opening a PR or publishing code updates, inspect the final diff and commits relative to the updated base:

   ```bash
   rtk git rev-list --count origin/<base>..HEAD
   rtk git log --oneline origin/<base>..HEAD
   rtk git diff --stat origin/<base>...HEAD
   ```

6. Run validation appropriate to the changes against the final result, including conflict resolutions. Reuse existing results only when the relevant combined source is unchanged.
7. Push when requested or necessary to open or update the PR. For rewritten published history, use `--force-with-lease` with the explicit remote commit recorded before rewriting. If the remote no longer matches, inspect the new commits instead of using an unconditional force push.
8. Create or update the PR when requested. Update an existing PR rather than creating another one. Write the title and description around the final diff using the project template. For multiline bodies submitted through `gh`, use a temporary file and `--body-file`.

## Edit PR Metadata

Read the identified PR, its current title and description, and its remote diff as needed. Edit only the requested fields using the project format. This route does not run Code Delivery, rewrite commits, push code, or start builds and tests.

## Inspect PR

Read the identified PR's base branch, latest head commit, mergeability, reviews, required checks, and relevant failure logs. Match checks to the current head and report the result and blockers. Keep inspection read-only; fixing code, rerunning CI, editing the PR, or merging belongs to separately authorized operations.

## Merge PR

Inspect the PR first. Merge only when the user has requested it and repository review and check requirements are satisfied. Pin the merge to the head commit whose reviews and checks were inspected; recheck after any new push.

If blocked, diagnose and report the reason. Enter Code Delivery only when the task also authorizes code fixes; do not bypass branch protection or silently expand a merge request into repair work. Confirm that the remote PR is merged.

## Post-Merge Follow-Up

Switch to the requested branch and run `pull --ff-only` only when that follow-up is requested. Protect local files. Delete branches only with authorization.

## Completion Report

Report the PR link, base branch, commit, operation actually completed, validation or inspection results, and remaining work. A successful push, an open PR, and a merged PR are distinct completion states.
