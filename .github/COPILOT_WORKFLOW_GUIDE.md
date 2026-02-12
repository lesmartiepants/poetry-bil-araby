# GitHub Copilot Workflow Guide

## Overview

The GitHub Copilot workflow (`.github/workflows/copilot.yml`) provides automated AI-powered code reviews and interactive assistance for pull requests in the Poetry Bil-Araby repository.

## Features

### 🤖 Automatic Code Reviews
- Triggers automatically when PRs are opened, updated, or synchronized
- Analyzes changed files and provides intelligent insights
- Categorizes changes by type (source, tests, config, docs)
- Detects potential issues (missing tests, API key exposure, etc.)

### 👀 Interactive Comment Responses
- Responds to @copilot mentions in PR comments
- Shows 👀 emoji immediately when processing a comment
- Provides context-aware answers and suggestions
- Reacts with 👍 on success or 😕 on errors

### 💡 Intelligent Insights

The workflow automatically detects and warns about:
- **Missing Tests**: Source code changes without corresponding test updates
- **Configuration Changes**: Updates to package.json, vite.config.js, etc.
- **Critical File Modifications**: Changes to app.jsx or server.js
- **Security Concerns**: API key references, SQL injection risks
- **Arabic/RTL Content**: Proper handling of Arabic text and RTL layout
- **Backend Security**: Parameterized queries for database operations

## Usage

### Automatic Reviews

Simply open or update a pull request. Copilot will automatically:
1. Analyze all changed files
2. Categorize changes by type
3. Provide insights and recommendations
4. Post a review comment with findings

### Interactive Mode

Mention `@copilot` in any PR comment to ask questions:

```
@copilot What are the potential issues with this change?
```

```
@copilot Can you review the database security in server.js?
```

```
@copilot Does this follow our React coding conventions?
```

Copilot will:
1. React with 👀 to acknowledge your comment
2. Analyze the context of your question
3. Provide a detailed response
4. React with 👍 when complete

## Workflow Triggers

### Pull Request Events
- `opened`: When a new PR is created
- `synchronize`: When new commits are pushed to the PR
- `reopened`: When a previously closed PR is reopened

### Comment Events
- `created`: When a new comment is posted
- `edited`: When an existing comment is modified

**Note**: The workflow only responds to comments on pull requests, not standalone issues.

## Permissions

The workflow requires:
- `contents: read` - To read repository files
- `pull-requests: write` - To post review comments
- `issues: write` - To create reactions and comments

## Code Review Output

Each review includes:

### 📊 Changes Summary
- Number of files changed
- Total lines added/removed
- Breakdown by file type

### 📁 File Categories
- **Source Code**: React components, JavaScript files
- **Tests**: Unit tests, E2E tests
- **Configuration**: package.json, config files
- **Documentation**: Markdown files
- **Other**: Any files not in above categories

### 💡 Insights
Context-aware warnings and suggestions based on:
- File patterns and naming conventions
- Repository coding standards
- Security best practices
- Testing requirements

### 📝 Changed Files
Complete list with:
- Status icon (➕ added, ➖ removed, 📝 modified)
- File path
- Lines added/removed

### 🎯 Recommendations
- Test commands to run locally
- Coding convention references
- CI/CD pipeline checks
- File-specific best practices

## Integration with Other Workflows

The Copilot workflow complements the existing CI pipeline:

1. **CI Pipeline** (`.github/workflows/ci.yml`): Runs automated tests, builds, E2E tests
2. **Copilot Workflow** (`.github/workflows/copilot.yml`): Provides AI-powered review and insights
3. **Deploy Workflow** (`.github/workflows/deploy.yml`): Handles production deployments

All three work together to ensure high-quality code and smooth deployments.

## Customization

### Adding New Insights

To add custom insight detection, edit the "Analyze code changes" step in `.github/workflows/copilot.yml`:

```javascript
// Add new pattern detection
if (files.some(f => f.filename.includes('your-pattern'))) {
  insights.push('🔍 Your custom insight message');
}
```

### Changing Review Frequency

To prevent duplicate reviews, the workflow checks for existing Copilot comments. Modify the "Post review comment" step to adjust this behavior.

### Custom Reactions

Change the emoji reactions in these steps:
- "Acknowledge comment with eyes emoji" - Initial acknowledgment (👀)
- "React to comment with success" - Success reaction (👍)
- "React to comment with failure" - Error reaction (😕)

## Troubleshooting

### Copilot Not Responding
1. Check that the workflow file exists: `.github/workflows/copilot.yml`
2. Verify PR has proper permissions (not from a fork without write access)
3. Check GitHub Actions logs for errors
4. Ensure the PR is not a draft (draft PRs may have limited workflow execution)

### No Eyes Emoji
1. Verify you're commenting on a PR (not a standalone issue)
2. Check that the comment was created/edited (not just viewed)
3. Review GitHub Actions logs for the workflow run

### Review Not Posted
1. Check if a review was already posted for this commit
2. Verify the workflow completed successfully in Actions tab
3. Review permissions in the workflow file

### Incorrect Insights
1. Review the changed files analysis in workflow logs
2. Check file pattern matching logic
3. Update insight detection rules as needed

## Best Practices

1. **Use Specific Mentions**: When asking questions, be specific about what you want reviewed
2. **Review Locally First**: Use Copilot as a supplement to your own code review
3. **Address Insights**: Take Copilot's warnings seriously, especially security-related ones
4. **Keep PRs Focused**: Smaller PRs get better, more actionable reviews
5. **Update Tests**: Copilot will flag missing tests - add them before merging

## Related Documentation

- [CI/CD Guide](.github/CI_CD_GUIDE.md) - Comprehensive CI/CD pipeline documentation
- [Testing Strategy](.github/TESTING_STRATEGY.md) - Testing approach and best practices
- [Copilot Instructions](.github/copilot-instructions.md) - Custom instructions for GitHub Copilot
- [Path-Specific Instructions](.github/instructions/) - Detailed coding conventions

## Support

For issues with the Copilot workflow:
1. Check the [Actions tab](../../actions) for workflow runs
2. Review workflow logs for error messages
3. Create an issue with the "bug" label
4. Include workflow run URL and error details

---

*This workflow is part of the Poetry Bil-Araby CI/CD pipeline, ensuring high-quality code through automated AI-powered reviews.*
