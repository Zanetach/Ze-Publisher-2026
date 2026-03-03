#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f "$ROOT_DIR/.env.local" ]]; then
	set -a
	# shellcheck disable=SC1091
	source "$ROOT_DIR/.env.local"
	set +a
fi

if [[ -z "${OBSIDIAN_VAULT_PATH:-}" && -z "${OBSIDIAN_PLUGIN_PATH:-}" ]]; then
	echo "Missing plugin target path."
	echo "Set OBSIDIAN_VAULT_PATH or OBSIDIAN_PLUGIN_PATH in .env.local"
	exit 1
fi

echo "Building frontend bundle..."
pnpm -C packages/frontend build

echo "Building obsidian plugin and syncing to vault plugin directory..."
pnpm -C packages/obsidian build

echo "Plugin sync completed."
