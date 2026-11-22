# Release and Hotfix Process

Use these processes for every production release. Replace `x.y.z` with the
approved semantic version, for example `1.0.0`.

Follow [Git workflow](../../../rules/git-workflow.md): publication requires
authorization, protected branches are integrated through reviewed PRs, and commit
messages may be written in Chinese or English. Publishing does not authorize bypassing branch
protection or deploying to production.

## Branches and tags

| Production branch | Development branch | Release branch | Hotfix branch | Git tag |
| --- | --- | --- | --- | --- |
| `main` | `develop` | `release-x.y.z` | `hotfix-x.y.z` | `vx.y.z` |

A release follows:
`develop` → `release-x.y.z` → `main` + `vx.y.z` → `develop`.
A hotfix starts from the current production tag `va.b.c` on `main`, uses
`hotfix-x.y.z`, and merges into `main`, then back into `develop`.

Fetch remote branches and tags before choosing versions or checking refs:

```bash
rtk git fetch origin --tags
```

Use the version explicitly supplied by the user. If no version is supplied,
increment the patch component of the latest stable `vx.y.z` production tag
reachable from `origin/main`. Keep its major and minor components and exclude
prerelease tags. If no production tag exists, obtain an explicit first-release
version. Check that the selected tag and both local and remote release/hotfix
branch names are unused.

### Publishing isolation

Read the current [CI workflow](../../../../.github/workflows/ci.yml) and
[Docker workflow](../../../../.github/workflows/docker.yml) before publishing.
CI and Docker builds run for pull requests. CI does not run on branch pushes.
Docker publication runs on pushes to `develop` and on all Git tag pushes;
`main`, `release-*`, and `hotfix-*` branch pushes do not publish images.
There is no Android build, APK upload, manual dispatch, or version-alias
publication in the current workflows.

| Component | ACR image | Development tag | Production tag for v1.0.0 |
| --- | --- | --- | --- |
| Backend with bundled Admin | `${ACR_REGISTRY}/${ACR_NAMESPACE}/office-agent-platform` | `dev` | `1.0.0` |
| Independent Agents service | `${ACR_REGISTRY}/${ACR_NAMESPACE}/office-agents` | `dev` | `1.0.0` |

Only the exact version tag is published; there are no `latest`, major/minor, or
`hotfix` aliases. Both images must correspond to the same release tag and commit.
Use the full version tag or a verified digest for deployment. Push the tag only
after verifying its target is the reviewed release commit on `origin/main`;
the workflow itself does not enforce main ancestry. Successful image builds do
not prove production deployment.

## Regular Release

### 1. Prepare develop

Start from a clean worktree and the latest remote `develop` branch.

```bash
rtk git switch develop
rtk git pull --ff-only origin develop
rtk git status --short --branch
rtk git tag --list vx.y.z
rtk git branch --list release-x.y.z
rtk git branch -r --list origin/release-x.y.z
```

Do not start a release with uncommitted changes or an out-of-date `develop`.
The target tag and local/remote release branch MUST NOT already exist.

### 2. Create the release branch

```bash
rtk git switch -c release-x.y.z
```

Release branches MUST be created from the updated `develop` branch and MUST
use the `release-x.y.z` naming format.

### 3. Update version metadata

Update every applicable product surface to `x.y.z`:

- Backend: set the shared subproject `version` in `backend/build.gradle`;
  release versions MUST NOT include `-SNAPSHOT`.
- Admin: set `version` in `frontend/admin/package.json` and synchronize root
  package metadata in `frontend/admin/bun.lock` if it records the version.
- Agents: set `[project].version` in `agents/pyproject.toml` and synchronize the
  `office-agent-service` package version in `agents/uv.lock`.

Only change root application version metadata. Do not replace dependency,
test fixture, migration, API payload, or business-data version values.

Validate lock files and run the release-required CI-equivalent checks from
[build and test rules](../../../rules/build-test-development.md) before merging.
Verify that the resolved backend, Admin, and Agents versions equal `x.y.z`, and
that `rtk git diff --check` passes. Report unavailable integration environments
and their skipped checks; do not treat skipped checks as passed.

### 4. Commit the version bump

Stage only the version-related files and use a concise version-bump message,
for example:

```bash
rtk git commit -m "Bump version to x.y.z"
```

The release branch SHOULD contain one version-bump commit.

### 5. Merge and tag main

Publish the release branch when authorized and open a release PR targeting
`main` using the [PR skill](../../pr/SKILL.md). Inspect the reviewed head and
required checks before merging with a merge commit. Do not bypass branch protection or push a local
merge directly to `main`. The release PR is an explicit exception to the normal
`develop` PR base.

After the PR is merged, update local `main` and verify the release branch's
changes are included. Create an annotated tag on the actual PR merge commit,
not on an unrelated newer `main` commit:

```bash
rtk git fetch origin --tags
rtk git tag -a vx.y.z <verified-release-merge-commit> -m "发布版本 x.y.z"
rtk git show --no-patch vx.y.z
```

### 6. Push the tag

```bash
rtk git push origin vx.y.z
```

Confirm that the remote tag points to the reviewed release commit on
`origin/main`. Inspect the Docker publication run for that exact tag and commit.
Do not move an already-published tag to retry a failed run.

### 7. Merge back into develop

Use the PR skill to merge the release branch back into the latest `develop`
through a reviewed PR with a merge commit. Preserve any newer development version and unrelated
work. Confirm the remote merge and required checks.

### 8. Completion criteria

A release is complete only when:

- `main` contains the release merge commit.
- `vx.y.z` points to that `main` merge commit.
- `develop` contains the release branch through a merge commit.
- Remote `main`, `develop`, and `vx.y.z` are updated.
- The final worktree is clean.
- Required CI and release build checks pass.

If untracked files block a switch or merge, do not delete or overwrite them.
Compare them with the incoming paths, preserve a backup when necessary, and
retry only after the collision has been resolved without data loss.

## Production Hotfix

A versioned `hotfix-x.y.z` branch is an integration branch for one production
patch release. It plays the same role for that patch as `develop` does for
normal development: fixes branch from it and merge back into it until the
release scope passes testing. Do not develop fixes directly on the integration
branch and do not add unrelated features.

### 1. Create the hotfix integration branch

Start from a clean worktree and the current production tag on the latest
remote `main`. Never create a production hotfix from `develop`.

```bash
rtk git switch main
rtk git pull --ff-only origin main
rtk git status --short --branch
rtk git tag --list vx.y.z
rtk git branch --list hotfix-x.y.z
rtk git branch -r --list origin/hotfix-x.y.z
rtk git merge-base --is-ancestor va.b.c origin/main
rtk git switch -c hotfix-x.y.z va.b.c
rtk git push -u origin hotfix-x.y.z
```

Replace `a.b.c` with the current production version. The target tag and branch
MUST NOT already exist. The hotfix version MUST be the explicitly approved
version, or the next patch after the current production tag when no version
was supplied.

### 2. Develop fixes from the hotfix branch

Create one minimal working branch per logical fix:

```bash
rtk git switch hotfix-x.y.z
rtk git pull --ff-only origin hotfix-x.y.z
rtk git switch -c bugfix/fix-description
```

Each fix MUST be reviewed and merged back into `hotfix-x.y.z`, not into
`develop` or `main`. Additional `bugfix/*` branches may be created from the
updated hotfix branch until the planned hotfix scope is complete.

### 3. Wait for testing to complete

Run the required focused, regression, release-build, and acceptance checks on
the integrated `hotfix-x.y.z` branch. A failed check MUST be fixed through a
new or existing `bugfix/*` branch and merged back into `hotfix-x.y.z`.

Do not bump the release version, merge to `main`, or create the release tag
until all required checks pass and the hotfix scope is frozen.

### 4. Update and commit version metadata

After testing passes, update every applicable product surface listed in
Regular Release step 3 to `x.y.z`, without `-SNAPSHOT`. Synchronize the lock
files and run the release-version validation again.

Commit only the version metadata with a concise message, for example:

```bash
rtk git commit -m "Bump version to x.y.z"
rtk git push origin hotfix-x.y.z
```

### 5. Merge main and create the tag

Open and merge a reviewed PR from `hotfix-x.y.z` into `main` using the PR skill.
Use a merge commit and pin the merge to the head whose required checks and reviews were inspected.
After the remote merge, fetch and tag its actual merge commit:

```bash
rtk git fetch origin --tags
rtk git tag -a vx.y.z <verified-hotfix-merge-commit> -m "发布热修复版本 x.y.z"
rtk git show --no-patch vx.y.z
rtk git push origin vx.y.z
```

Verify that the tag points to the hotfix merge commit on `origin/main` and
inspect publication for both images at that exact tag and commit.

### 6. Merge the hotfix back into develop

Record the latest `origin/develop` application versions. Prepare the merge on
a separate working branch and submit a reviewed PR into `develop` using a merge
commit; do not
commit or push directly to `develop`.

Compare the backend semantic version without its `-SNAPSHOT` suffix:

- If `develop` has a `-SNAPSHOT` version strictly greater than `x.y.z`, retain
  all pre-merge `develop` application versions and lock-file metadata while
  still merging every hotfix code change.
- Otherwise, use `x.y.z` consistently across the backend, Admin, and Agents
  application metadata and their lock files.
- If the numeric application versions disagree before or after the merge,
  resolve the inconsistency before committing. Preserve each ecosystem's
  supported version syntax.

Verify the resolved versions and the combined code, then confirm the remote
PR merge.

### 7. Hotfix completion criteria

A hotfix is complete only when:

- All planned `bugfix/*` branches were merged into `hotfix-x.y.z` and required
  tests passed before the version bump.
- `main` contains the `hotfix-x.y.z` merge commit.
- `vx.y.z` points to that merge commit on `main`.
- `develop` contains the hotfix code and follows the Snapshot comparison rule.
- Remote `hotfix-x.y.z`, `main`, `develop`, and `vx.y.z` are updated.
- The final worktree is clean.
