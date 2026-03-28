---
name: skill-builder
description: Use this skill when you need to build a new agent skill or refine an existing one according to the Agent Skill standard (agentskills.io) and Anthropic best practices. It provides guidelines on structure, progressive disclosure, and instruction writing.
---

# Skill Builder Best Practices

This skill encapsulates the best practices for building high-quality, efficient, and reliable "Agent Skills". These guidelines are based on the [Agent Skills specification](https://agentskills.io) and Anthropic's recommendations.

## 1. The "Agent Skill" Standard

A skill is a folder containing a `SKILL.md` file. Use **Progressive Disclosure** to ensure the agent loads only what it needs.

* **Structure**:
  * Folder: `your-skill-name` (kebab-case).
  * File: `SKILL.md` (root of the folder).
  * File: `CHANGELOG.md` (for tracking version history).
  * Subfolders (optional): `scripts/`, `references/`, `assets/`.

* **Versioning**: Use Calendar Versioning (CalVer) in the format `YYYY.MM.DD[.patch]`.

* **Frontmatter**: Must start with YAML frontmatter. This is the only part the agent sees initially to decide if it needs to load the full skill.

    ```markdown
    ---
    name: kebab-case-name
    description: Detailed description including "Use this skill when..."
    ---
    ```

## 2. Golden Rules

| Component | Best Practice |
| :--- | :--- |
| **Naming** | Use `kebab-case`. Avoid vague names like `utils`. |
| **Description** | Explicitly state **when** the agent should activate it. |
| **History** | (Optional) Maintain a `CHANGELOG.md` to track updates. |
| **One Purpose** | One skill, one purpose. Split "God skills". |
| **Repetition** | If you explain something 3+ times, make it a skill. |
| **Context** | Reference external files instead of loading everything. |
| **Safety** | Ensure scripts are scoped safely. |

## 3. Technical Implementation

To keep the main standard lean, specific technical patterns for implementation are documented separately:

* [Python Implementation Guidelines](python-guidelines.md): Best practices for `uv`, CLI design, and dependency isolation.

## 4. Instruction Writing

* Treat instructions like a handbook for a junior developer.
* Be explicit, use clear steps, and provide code examples.
* If a skill fails, ask the agent why and refine the instructions.

## 4. Resources

* [Agent Skills Specification](https://agentskills.io/specification)
* [Anthropic Engineering Blog](https://www.anthropic.com/engineering)
* [VS Code Agent Skills Docs](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
