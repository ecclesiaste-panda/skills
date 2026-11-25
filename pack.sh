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

git archive --format=zip -o "$out" HEAD "$skill"
ssh-keygen -Y sign -f "${SIGNING_KEY:-$HOME/.ssh/id_ed25519}" -n file "$out"

echo "built $out and $out.sig ($(git rev-parse --short HEAD))"
