---
applyTo: "**/*.md"
excludeAgent: "coding-agent"
---

# Documentation Instructions

## General Principles

- Write for developers (technical audience)
- Be concise but complete
- Include code examples where helpful
- Keep documentation up-to-date with code changes

## Documentation Structure

This repository has several documentation files:

- `README.md` - User-facing overview and setup
- `CLAUDE.md` - Comprehensive guide for Claude AI
- `.github/TESTING_STRATEGY.md` - Testing strategy and philosophy
- `.github/CI_CD_GUIDE.md` - CI/CD operational reference
- `e2e/README.md` - E2E testing guide (if exists)

## Markdown Style

### Headers
- Use ATX-style headers (`#`, `##`, `###`)
- One H1 per document
- Logical hierarchy (don't skip levels)

```markdown
# Main Title (H1)

## Section (H2)

### Subsection (H3)
```

### Code Blocks
- Always specify language for syntax highlighting
- Use bash for commands, javascript/jsx for code
- Include comments for clarity

````markdown
```bash
# Install dependencies
npm install
```

```javascript
// Example React component
const App = () => {
  return <div>Hello</div>;
};
```
````

### Lists
- Use `-` for unordered lists (consistent style)
- Use `1.` for ordered lists
- Indent nested lists with 2 spaces

```markdown
- First item
  - Nested item
- Second item

1. First step
2. Second step
```

### Links
- Use descriptive link text (not "click here")
- Prefer relative links for internal docs
- Include links to external resources where helpful

```markdown
See [Testing Strategy](.github/TESTING_STRATEGY.md) for details.
```

## README.md Sections

Standard sections (keep this order):
1. Title and description
2. Features
3. Setup/Installation
4. Usage
5. Tech stack
6. Project structure
7. Testing
8. Documentation
9. Deployment (if applicable)

## Technical Documentation

### Command Documentation
- Show the command first
- Explain what it does
- Include common options/flags

```markdown
### Build Project
```bash
npm run build
```

Builds the production bundle to `dist/` directory.
```

### Architecture Documentation
- Use diagrams when helpful (ASCII art is fine)
- Explain key concepts and patterns
- Link to relevant code files

### API Documentation
- Document request/response formats
- Include authentication requirements
- Show example usage

## Code Examples in Docs

### Good Examples
- Self-contained and runnable
- Show best practices
- Include comments for non-obvious parts
- Demonstrate one concept at a time

```markdown
```javascript
// Fetch poem insights from Gemini API
const fetchInsight = async (poemText) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('API key not configured');
  }
  
  const response = await fetch(`https://api.gemini.com/...`, {
    method: 'POST',
    body: JSON.stringify({ text: poemText }),
  });
  
  return await response.json();
};
```
```

### Bad Examples (Avoid)
- Incomplete code that won't run
- Too much code at once
- No context or explanation
- Outdated examples that don't match current code

## Updating Documentation

### When Code Changes
- Update relevant docs immediately
- Check for broken links
- Verify code examples still work
- Update version numbers if applicable

### Documentation Tests
- README should match actual setup process
- Commands should be tested before documenting
- Examples should be verified

## README.md Best Practices

### Setup Instructions
- List prerequisites first
- Step-by-step installation
- Include troubleshooting for common issues
- Test on fresh machine when possible

### Features List
- Highlight key features with icons/emojis
- Be specific (not just "great UX")
- Link to more details where available

### Usage Guide
- Start with most common use case
- Progressive disclosure (simple → advanced)
- Include screenshots if UI-heavy

## CLAUDE.md Specifics

- Comprehensive guide for Claude AI (not human users)
- Include architectural decisions and rationale
- Document gotchas and common mistakes
- Link to specific code sections (file:line)

## CI/CD Documentation

- Document pipeline stages
- Explain CI-specific behaviors
- Include timing expectations
- Document failure recovery steps

## Testing Documentation

- Explain testing philosophy
- Document coverage goals
- Include how to run tests
- Show example test patterns

## Arabic Content in Docs

- Use actual Arabic text for examples (not transliteration)
- Explain RTL considerations
- Document font usage (Amiri, Tajawal)
- Note any Arabic-specific testing needs

```markdown
The app uses two Arabic fonts:
- **Amiri** (`font-amiri`) - Elegant serif for poetry
- **Tajawal** (`font-tajawal`) - Clean sans-serif for UI

Always test with actual Arabic text: `العنوان` not `al-'unwān`.
```

## Versioning

- Use semantic versioning for releases
- Document breaking changes clearly
- Maintain changelog (if project uses one)

## Tone and Style

- Professional but approachable
- Active voice preferred
- Present tense for instructions
- Avoid jargon without explanation

### Good Tone
```markdown
Run `npm test` to execute the test suite.
```

### Bad Tone  
```markdown
You might want to perhaps try running the test command if you feel like it.
```

## Common Documentation Mistakes

1. **Outdated examples** - Keep examples in sync with code
2. **Missing prerequisites** - Always list dependencies
3. **Assumed knowledge** - Explain technical terms
4. **No troubleshooting** - Document common issues
5. **Broken links** - Test all links periodically
6. **Copy-paste errors** - Verify all code examples
7. **Inconsistent formatting** - Follow style guide

## Documentation Checklist

Before committing documentation changes:

- [ ] Spell check completed
- [ ] Code examples tested
- [ ] Links verified
- [ ] Screenshots up-to-date (if applicable)
- [ ] Consistent formatting
- [ ] No outdated information
- [ ] Follows existing style
