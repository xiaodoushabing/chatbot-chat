# Python Implementation Guidelines

When building agent skills in Python, follow these technical standards to ensure they are high-performing, secure, and easy for AI agents to use.

## 1. Dependency Management with `uv`

Avoid complex virtual environment setup instructions. Use [uv](https://github.com/astral-sh/uv) to handle dependencies automatically.

### Inline Script Metadata (PEP 723)

Always include dependencies at the top of your script. This allows `uv run <script>` to work instantly.

```python
# /// script
# dependencies = [
#   "google-api-python-client",
#   "google-auth-oauthlib",
# ]
# ///
```

### `pyproject.toml`

Include a `pyproject.toml` in the skill folder to allow users to install the skill as a global tool.

```toml
[project]
name = "your-skill-name"
version = "2026.01.20"
dependencies = ["..."]

[project.scripts]
your-skill-command = "scripts.main:main"
```

## 2. CLI Design

### JSON Output

Agents prefer structured data over human-readable text.

- Always provide a `--json` flag.
- When `--json` is active, the ONLY output to `stdout` should be valid JSON.
- Use `sys.exit(1)` and JSON-formatted error messages for failures.

### Statelessness

- Do NOT use interactive prompts (`input()`).
- Accept all configurations via CLI arguments or environment variables.
- If authentication is required, handle it via local credential files (e.g., `credentials.json`, `token.json`).

## 3. Security: Principle of Least Privilege

- **Granular Scopes**: If a skill only needs to read a calendar, do NOT request full Google account access.
- **Isolated Tokens**: Each skill should maintain its own `token.json` or equivalent in its own folder. This ensures that if one skill is compromised, the others remain secure.

## 4. Documentation

Each Python skill should have:

- **`README.md`**: Explaining how to run it via `uv run` and how to update it.
- **`CHANGELOG.md`**: Tracking changes using **CalVer** (YYYY.MM.DD).
- **`SKILL.md`**: High-level capability overview for the agent.

## 5. Versioning

Use [CalVer](https://calver.org/) (`YYYY.MM.DD`) for both the `version` field in `SKILL.md` and the `pyproject.toml`.
