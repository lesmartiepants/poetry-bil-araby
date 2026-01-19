---
applyTo: "**/*.md"
excludeAgent: "coding-agent"
---

# Documentation

**Audience:** Developers (technical)
**Style:** Concise but complete

## Markdown Standards

**Headers:** ATX-style (`#`, `##`, `###`), one H1 per doc
**Code blocks:** Always specify language for syntax highlighting
**Lists:** Use `-` for unordered, `1.` for ordered
**Links:** Descriptive text (not "click here"), prefer relative for internal docs

## Code Examples

**Good examples:** Self-contained, runnable, show best practices, one concept at a time

```javascript
// ✅ Good - clear, commented, specific
const fetchPoem = async () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('API key not configured');
  return await fetch('...');
};
```

**Avoid:** Incomplete code, too much at once, no context, outdated examples

## README Structure

1. Title and description
2. Features
3. Setup/Installation
4. Usage
5. Tech stack
6. Project structure
7. Testing
8. Documentation links

## Commands

Show command first, explain what it does:

```markdown
### Build Project
\`\`\`bash
npm run build
\`\`\`
Builds production bundle to `dist/`.
```

## Arabic Content

- Use actual Arabic text in examples: العنوان not al-'unwān
- Explain RTL considerations
- Document font usage (Amiri for poems, Tajawal for UI)

## Tone

- Professional, approachable
- Active voice, present tense
- Avoid jargon without explanation

**Good:** Run `npm test` to execute tests.
**Bad:** You might want to perhaps try running the test command.

## Updating Docs

- Update when code changes
- Verify code examples work
- Test on fresh machine when possible
- Check for broken links
