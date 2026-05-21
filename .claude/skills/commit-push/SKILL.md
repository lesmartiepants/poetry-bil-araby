---
name: commit-push
description: Stages changed files, creates a conventional commit, and pushes to remote. Quick workflow for frequent commits during sprints.
user_invocable: true
---

# Commit & Push

Quick workflow to stage, commit, and push changes with conventional commit format.

## Invocation

When the user runs `/commit-push`, execute the following workflow.

## Step 1: Assess Changes

```bash
git status
git diff --stat
git diff --staged --stat
```

Review the working tree to understand what changed.

## Step 2: Analyze & Categorize

Determine the appropriate commit type based on changes:

| Type | When to Use |
|------|-------------|
| `feat` | New feature or capability added |
| `fix` | Bug fix or correction |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Build, config, or tooling changes |
| `ci` | CI/CD pipeline changes |
| `perf` | Performance improvements |
| `style` | Formatting, whitespace, or style-only changes |

Determine the scope from the affected files/directories (e.g., `auth`, `api`, `ui`, `e2e`).

## Step 3: Stage Files

Stage relevant files, excluding sensitive files:

```bash
# Stage specific files (preferred over git add -A)
git add <file1> <file2> ...

# NEVER stage these:
# .env, .env.local, credentials.json, *.pem, *.key
```

If `.env` or credential files appear in the diff, warn the user and skip them.

## Step 4: Create Conventional Commit

Create the commit using HEREDOC format for proper message formatting:

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <concise description>

<optional body with details>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

Guidelines:
- Subject line under 72 characters
- Use imperative mood ("add", "fix", "update", not "added", "fixed")
- Body explains "why" not "what" (the diff shows "what")
- Include issue references if applicable (`Fixes #123`)

## Step 5: Push to Remote

```bash
# Push to current branch
git push

# If no upstream, set it
git push -u origin $(git branch --show-current)
```

## Step 6: Report

Output the result:
- Commit hash (short)
- Branch name
- Files committed (count)
- Commit message summary
- Push status (success/failure)
