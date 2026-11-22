<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->

# Gemini token and request efficiency

When changing any Gemini integration, follow [the efficiency guide](apps/backend/docs/gemini-efficiency.md).

- Reuse verified TMDB text and persisted translations before generating. Send only missing or changed fields; never regenerate a cached title just to translate its description.
- Build task-specific payloads. Exclude image URLs, UI metadata, duplicate records, empty optional fields and unrelated history. Preserve facts needed for the task.
- Use compact JSON and small response schemas. Return IDs for selection tasks, with short explanations only where the product needs them. Validate all returned IDs and text locally.
- Bound input and output separately. Size output limits for the actual task and batch; detect truncation instead of blindly retrying. Do not shorten source synopses when the task is faithful translation.
- Minimize thinking only on models that explicitly support the setting, and verify quality before changing model or reasoning settings.
- Distinguish token cost from request quotas. Batching several items in one generation reduces requests; shorter prompts and context caching do not remove daily request limits.
- Keep completed translations durable and deduplicate in-flight work. A process-local singleflight is not a cross-server lock.
- Respect provider retry timing. Do not repeatedly retry a daily-quota error, rotate keys to evade quotas, or silently increase budgets or enable billing.
- Measure input, output, thinking and cached tokens per operation/model without logging credentials, full prompts or personal taste profiles. Report measured savings, not guessed percentages.
- Default tests to mocked model calls. Live Gemini calls must be explicit, bounded smoke checks; ordinary test runs must not spend model quota.

These rules guide new changes; the guide distinguishes existing protections from pending implementation work.
