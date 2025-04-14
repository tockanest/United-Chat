# MilestoneVer Specification

## Version Format

```
MILESTONE.MAJOR.MINOR[-PRERELEASE][+BUILD]
```

## Components

### MILESTONE

- **Definition:** Represents a significant milestone in the project's lifecycle, such as a major marketing event, production release, or substantial feature completion.
- **Increment Condition:** Incremented when a change is deemed significant by project stakeholders (e.g., developers, product managers, or investors), based on its impact on the project's purpose, feature set, or market position.
- **Reset Behavior:** Incrementing MILESTONE resets MAJOR and MINOR to 0 (e.g., 1.5.9 → 2.0.0).
- **Stability Requirement:** All known critical bugs must be resolved; known non-critical bugs must be documented with their status (e.g., "won't fix" or "low priority").

### MAJOR

- **Definition:** Indicates incompatible changes to the API or ABI.
- **Increment Condition:** Incremented when a breaking change is introduced that requires users to adapt their integration.
- **Behavior by MILESTONE (Optional, recommended.):**
  - MILESTONE 0: Experimental phase, allowing frequent breaking changes to establish stability.
  - MILESTONE 1 and above: Conservative phase, limiting breaking changes to essential modifications.
- **Reset Behavior:** Incrementing MAJOR resets MINOR to 0 (e.g., 1.2.3 → 1.3.0).
- **Limit (Not recommended.):** No upper bound; MAJOR may may increase indefinitely (e.g., 1.999.0 is valid). 

### MINOR

- **Definition:** Denotes backward-compatible enhancements or fixes.
- **Increment Condition:** Incremented for:
  - Backward-compatible bug fixes.
  - Backward-compatible feature additions.
  - Backward-compatible performance improvements.
- **Limit:** No upper bound; MINOR may increase indefinitely (e.g., 1.0.999 is valid).

### PRERELEASE (Optional)

- **Definition:** An identifier for pre-release versions, indicating instability or incomplete compatibility.
- **Format:** Appended with a hyphen, e.g., `-alpha`, `-beta.1`, `-rc.2`.
- **Precedence:** Pre-release versions have lower precedence than their stable counterparts (e.g., 1.0.0-alpha < 1.0.0).
- **Ordering:** Multiple pre-release identifiers are sorted numerically and/or alphabetically (e.g., 1.0.0-alpha.1 < 1.0.0-alpha.2).

### BUILD (Optional)

- **Definition:** Metadata providing additional context about the build, such as a timestamp or commit hash.
- **Format:** Appended with a plus sign, e.g., `+20250325`, `+git.abc123`.
- **Precedence:** Does not affect version precedence; purely informational.

## Deprecation Policy

- **Deprecation Process:**
  - Features marked as deprecated in version X.Y.Z must include warnings and specify alternatives.
  - Deprecated features may only be removed in version X.(Y+1).0 or later.
- **Documentation:** Deprecation notices must be clearly documented in release notes.

## Examples

```
0.0.1        Initial development release with a patch.
0.1.0        Breaking API change during experimental phase.
0.1.1        Backward-compatible bug fix.
0.2.0-alpha  Pre-release version with breaking changes.
0.2.0        Stable release with breaking changes.
1.0.0        First significant milestone release.
1.0.1        Post-milestone bug fix.
1.1.0        Breaking change after milestone.
2.0.0        Second significant milestone release.
```

## Usage Notes

- **Purpose:** MilestoneVer is designed to balance technical versioning with strategic project milestones, emphasizing significant releases over frequent incremental changes.
- **Flexibility:** The determination of a MILESTONE increment is left to project stakeholders, allowing adaptation to specific project needs.
- **Tooling:** No automated tooling is assumed; version management is manual and requires discipline to enforce rules.