# Agent Skills

This repo ships an **agent skill** that teaches AI coding agents (Claude Code, Cursor, Codex, and others) how to build, configure, and debug native Apple extension and target types with [`@bacons/apple-targets`](../packages/apple-targets).

The skill lives at [`skills/apple-targets`](../skills/apple-targets) and is built around an entry-point [`SKILL.md`](../skills/apple-targets/SKILL.md) plus one in-depth reference document per Apple extension type (widgets, App Clips, share extensions, watchOS apps, Safari extensions, notification extensions, VPN/network extensions, and 40+ more).

## What's in the skill

Each reference document gives an agent everything it needs to ship a production implementation of a single target type:

- Apple documentation links and WWDC session history
- Runtime behavior and lifecycle explanation
- Real-world use cases organized by app type
- Production-ready Swift code examples
- Platform availability and minimum-OS matrix
- Common gotchas, memory limits, and silent failure modes
- Setup instructions specific to `@bacons/apple-targets`

The `SKILL.md` entry point indexes every reference doc by category and use case, so an agent can quickly route a request like "add a home screen widget" or "block spam calls" to the right document. Shared capability guides (e.g. App Groups) live under [`skills/apple-targets/entitlements/`](../skills/apple-targets/entitlements).

## Installing with `npx skills`

The skill is distributed through [`npx skills`](https://github.com/vercel-labs/skills), the open agent-skills package manager. From any project, run:

```sh
npx skills add EvanBacon/expo-apple-targets/tree/main/skills/apple-targets
```

The CLI:

1. **Auto-detects** the coding agents installed on your machine (if none are found, it prompts you to choose).
2. **Copies** `SKILL.md` and the supporting reference docs into the agent's skills directory — for example `.claude/skills/apple-targets/` for Claude Code, or `.agents/skills/` for other agents.
3. **Activates** the skill automatically: the agent reads `SKILL.md`'s frontmatter (`name` + `description`) and loads the relevant reference doc whenever you ask it to add or debug an Apple extension.

### Updating and removing

```sh
# Update all installed skills interactively
npx skills update

# Update just this skill
npx skills update apple-targets

# Remove this skill
npx skills remove apple-targets
```

### Install scope

By default the skill installs into the current project. Most agents also support a global scope so the skill is available across every project — follow the prompts from `npx skills` to choose where to install.

## Using the skill without installing

The skill is plain Markdown, so you can also read it directly in this repo or point an agent at the GitHub URL. Installing with `npx skills` is recommended because it keeps the docs local to your agent and lets the agent load them automatically.

## Contributing a new skill document

Each target type's reference doc follows the template at [`skills/apple-targets/_template.md`](../skills/apple-targets/_template.md). When you add a new target type to the registry (see [CLAUDE.md](../CLAUDE.md)), add a matching reference doc and link it from the index tables in `SKILL.md`.
