#!/usr/bin/env bash
set -euo pipefail

timestamp="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
output="${1:-./backups/modernnovel-${timestamp}.sql}"

mkdir -p "$(dirname "$output")"
wrangler d1 export DB --remote --output "$output"
printf 'D1 backup written to %s\n' "$output"
