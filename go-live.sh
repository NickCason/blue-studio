#!/usr/bin/env bash
#
# go-live.sh — build + deploy Blue Studio to Cloudflare Pages.
#
# Secrets live in .env.local (gitignored). See .env.local.example for the shape.
# This script reads .env.local automatically — it never holds secrets itself,
# and never auto-commits anything to git.
#
# Steps:
#   1. Source .env.local (if present)
#   2. Ensure Cloudflare Wrangler is authenticated
#   3. Build the site (pnpm install + pnpm build)
#   4. Deploy ./dist to Cloudflare Pages via wrangler
#   5. If working tree is clean, push origin/main (skip otherwise — never auto-commits)
#
# Re-running is safe.

set -euo pipefail

# =============================================================================
#  Non-secret config (safe to live in this committed file)
# =============================================================================

GITHUB_USER="NickCason"
REPO_VISIBILITY="public"
CF_PROJECT_NAME="blue-studio"
CONTACT_EMAIL="hello@bluestudio.space"

# =============================================================================
#  Don't edit below.
# =============================================================================

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
dim()   { printf '\033[2m%s\033[0m\n' "$*"; }
note()  { echo; printf '\033[1;35m▶ %s\033[0m\n' "$*"; }
ok()    { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn()  { printf '  \033[33m!\033[0m %s\n' "$*"; }
err()   { red "ERROR: $*" >&2; exit 1; }

[[ -d .git ]]                              || err "not in a git repo"
command -v node >/dev/null                 || err "node not found"
command -v pnpm >/dev/null                 || err "pnpm not found (npm i -g pnpm@9)"
command -v gh >/dev/null                   || err "gh not found (brew install gh)"

# Source .env.local for secrets (TINA_*, PUBLIC_FORMSPREE_ENDPOINT, etc.)
if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
else
  warn ".env.local not found — copy .env.local.example to .env.local and fill it in"
  warn "continuing without Tina/Formspree (site will still build + deploy)"
fi

# -----------------------------------------------------------------------------
note "1/4 · Cloudflare Wrangler auth"
if ! npx --yes wrangler whoami >/dev/null 2>&1; then
  dim "  not logged in — opening Cloudflare auth flow (browser)"
  npx --yes wrangler login
fi
ok "wrangler authenticated"

# -----------------------------------------------------------------------------
note "2/4 · Install + build"
pnpm install
pnpm build
ok "built dist/ ($(du -sh dist 2>/dev/null | awk '{print $1}'))"

# -----------------------------------------------------------------------------
note "3/4 · Cloudflare Pages deploy: ${CF_PROJECT_NAME}"
npx --yes wrangler pages project create "${CF_PROJECT_NAME}" \
  --production-branch main \
  --compatibility-date "$(date -u +%Y-%m-%d)" \
  >/dev/null 2>&1 || dim "  project already exists — continuing"

npx --yes wrangler pages deploy ./dist \
  --project-name="${CF_PROJECT_NAME}" \
  --branch=main \
  --commit-dirty=true

# -----------------------------------------------------------------------------
note "4/4 · GitHub push"
if [[ -z "$(git status --porcelain)" ]]; then
  if git remote get-url origin >/dev/null 2>&1; then
    git push origin main 2>&1 | tail -3 || warn "push failed; resolve manually"
    ok "pushed origin/main"
  else
    warn "no origin remote configured (skipping push)"
  fi
else
  warn "working tree is dirty — commit your changes manually, then push:"
  warn "  git status"
  warn "  git add <files>; git commit -m '...'; git push"
  warn "(this script never auto-commits — that was the security bug from earlier)"
fi

LIVE_URL="https://${CF_PROJECT_NAME}.pages.dev"
echo
green "Done."
echo
echo "  Live:    ${LIVE_URL}"
echo "  GitHub:  https://github.com/${GITHUB_USER}/${CF_PROJECT_NAME}"
echo
if [[ -z "${TINA_TOKEN:-}" ]]; then
  echo "  Tina CMS: not wired (TINA_TOKEN missing from .env.local)"
fi
if [[ -z "${PUBLIC_FORMSPREE_ENDPOINT:-}" ]]; then
  echo "  Contact form: mailto:${CONTACT_EMAIL} fallback (no Formspree endpoint)"
fi
echo
