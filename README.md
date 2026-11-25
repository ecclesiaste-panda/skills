# Personal skills

Skills I developed on client work, made generic so they can be shared or reused. Each folder is
self-contained: copy it into a project's `.claude/skills/` (or `~/.claude/skills/` for all
projects) and Claude Code picks it up; without Claude Code, `SKILL.md` reads as a plain guide.

Nothing here may contain client names, private notes, secrets, or code copied from a client repo.

| Skill | What it does |
|---|---|
| [scroll-driven-homepage](scroll-driven-homepage/SKILL.md) | From an inspiration site to a reviewed, accessible, fast scroll-driven homepage (pinned scenes, word-by-word text, dive into the product, timed demos). No animation library, any framework. |

## Sharing a skill

`./pack.sh <skill>` builds `dist/<skill>-<version>.zip` from the last commit (its `VERSION` file
gets the commit id and date) and signs it: send the `.zip` and the `.zip.sig`. When a skill has a
`SKILL.lite.md`, it also builds `dist/<skill>-<version>-essential.SKILL.md`: one self-contained file
(core code inlined) to share on its own; friends ask me for the full zip if they get stuck. Each skill carries
its own `LICENSE`. To check a zip came from me unchanged, a friend needs `allowed_signers` (my
public key, sent separately) and runs:

    ssh-keygen -Y verify -f allowed_signers -I ecclesiaste -n file -s <zip>.sig < <zip>
