# Skill Document Template

Reference guide for writing skill documents in this repo. Each skill doc covers one Apple extension target type and should give an AI agent everything it needs to build a production implementation.

## Frontmatter (required)

```yaml
---
title: Human-Readable Extension Name
description: One sentence. What the extension does and why you'd use it. No jargon in the first few words.
version: iOS X.0+, macOS Y.0+ (minimum OS where the extension type is available)
---
```

## Structure

### 1. Title + One-Liner
`# Human-Readable Name (\`target-type-slug\`)`

One paragraph explaining what this extension does in plain language. Focus on the user-facing behavior, not the API surface.

### 2. Apple Documentation
Bulleted list of links to Apple's developer docs. Prioritize:
- The framework overview page
- The key class/protocol the extension subclasses
- Any Apple guide/article specifically about this extension type
- Related sample code if it exists

### 3. WWDC History
Chronological list of WWDC sessions where this extension type was introduced or significantly updated. Format:
```
- **[WWDC YEAR, Session XXXXX -- Title](url)** -- One sentence on what was covered.
```
Include the year the extension was introduced and any major API changes in subsequent years.

### 4. What It Does
Explain the runtime behavior. What triggers the extension? What does the system pass to it? What does it return? Use a numbered flow when the interaction has clear steps.

### 5. Use Cases
2-4 subsections with `###` headings. Each describes a real-world scenario where you'd build this extension. Name specific app categories or industries. This is the section that helps an agent decide whether this is the right target type.

### 6. Key Classes (table)
| Class | Role |
|-------|------|
| `ClassName` | One sentence describing what to subclass/implement and its core responsibility. |

### 7. Implementation
The most important section. Include:
- **The most common implementation pattern** as a complete, copy-pasteable Swift code block with inline comments explaining each step.
- **Secondary patterns** if the extension supports multiple modes (e.g., with/without UI).
- Do NOT show the bare template -- show a realistic implementation that an agent can adapt.
- Use numbered inline comments (`// 1.`, `// 2.`) to walk through the flow.

### 8. Using with @bacons/apple-targets
Brief -- just the three commands with nuanced prebuild guidance:
```sh
bunx create-target <type>
```
```js
// app.json -- show the plugin entry
```
```sh
# Initial setup, or after changing expo-target.config.js, app.json, or adding/removing targets
npx expo prebuild --clean

# Swift files in targets/ are automatically linked - no prebuild needed for code changes
# Only re-run prebuild when config changes or to preserve manual Xcode modifications (omit --clean)
```

### 9. Platform Availability (table)
| Platform | Minimum OS | Notes |
|----------|-----------|-------|

### 10. Gotchas
Bulleted list of **bold lead-in** + explanation. Include:
- Common mistakes from Apple Developer Forums
- Privacy/sandbox restrictions
- Known iOS version bugs
- Required entitlements or capabilities that aren't obvious
- Anything that would cause silent failures

## Quality Checklist

- [ ] Frontmatter has title, description, version
- [ ] Every Apple doc link uses `https://developer.apple.com/...` format
- [ ] WWDC links use `https://developer.apple.com/videos/play/wwdcYYYY/XXXXX/`
- [ ] At least one complete, realistic Swift implementation (not just the template stub)
- [ ] Use cases name specific app categories, not abstract descriptions
- [ ] Gotchas include at least one forum-sourced issue
- [ ] No internal file paths from this repo (no `packages/apple-targets/src/...`)
- [ ] The "Using with @bacons/apple-targets" section is concise (3 code blocks max)
- [ ] Platform table covers iOS, iPadOS, macOS, watchOS, tvOS, visionOS
