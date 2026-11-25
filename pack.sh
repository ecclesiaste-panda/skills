#!/usr/bin/env bash
# Build a shareable zip of one skill from the last commit, then sign it with my SSH key.
#   ./pack.sh scroll-driven-homepage
# Output in dist/: <skill>-<version>.zip and <skill>-<version>.zip.sig
# Friends verify with (allowed_signers holds my public key, sent separately):
#   ssh-keygen -Y verify -f allowed_signers -I ecclesiaste -n file -s <zip>.sig < <zip>
set -euo pipefail
cd "$(dirname "$0")"

skill="${1:?usage: ./pack.sh <skill-folder>}"
[ -f "$skill/SKILL.md" ] || { echo "no $skill/SKILL.md" >&2; exit 1; }
if [ -n "$(git status --porcelain -- "$skill")" ]; then
  echo "$skill has uncommitted changes: commit first, the zip is built from HEAD" >&2
  exit 1
fi

version="$(sed -n 's/^  version: *//p' "$skill/SKILL.md" | head -1)"
out="dist/$skill-${version:-0}.zip"
mkdir -p dist
rm -f "$out" "$out.sig"

key="${SIGNING_KEY:-$HOME/.ssh/id_ed25519}"
git archive --format=zip -o "$out" HEAD "$skill"
ssh-keygen -Y sign -f "$key" -n file "$out"
echo "built $out and $out.sig ($(git rev-parse --short HEAD))"

# Essential edition: one SKILL.md, built from SKILL.lite.md with {{file}} replaced by
# that file from references/ (as committed), plus {{version}} and {{commit}}.
if git cat-file -e "HEAD:$skill/SKILL.lite.md" 2>/dev/null; then
  lite="dist/$skill-${version:-0}-essential.SKILL.md"
  rm -f "$lite" "$lite.sig"
  SKILL="$skill" VERSION="${version:-0}" COMMIT="$(git rev-parse --short HEAD)" python3 - > "$lite" <<'PY'
import os, re, subprocess
skill = os.environ["SKILL"]
show = lambda path: subprocess.run(["git", "show", f"HEAD:{path}"], check=True, capture_output=True, text=True).stdout
def fill(m):
    name = m.group(1)
    if name == "version": return os.environ["VERSION"]
    if name == "commit": return os.environ["COMMIT"]
    code = show(f"{skill}/references/{name}")
    return "\n".join(l for l in code.rstrip("\n").split("\n") if "SPDX-License-Identifier" not in l)
print(re.sub(r"\{\{([\w.-]+)\}\}", fill, show(f"{skill}/SKILL.lite.md")), end="")
PY
  ssh-keygen -Y sign -f "$key" -n file "$lite"
  echo "built $lite and $lite.sig"
fi
