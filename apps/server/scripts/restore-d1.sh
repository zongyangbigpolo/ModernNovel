#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  printf 'Usage: %s <ISO-8601 timestamp or bookmark>\n' "$0" >&2
  exit 2
fi

target="$1"
printf 'This will restore the production D1 database DB to %s.\n' "$target"
printf 'Type RESTORE to continue: '
read -r confirmation

if [[ "$confirmation" != "RESTORE" ]]; then
  printf 'Restore cancelled.\n'
  exit 1
fi

if [[ "$target" == *T* ]]; then
  wrangler d1 time-travel restore DB --timestamp "$target"
else
  wrangler d1 time-travel restore DB --bookmark "$target"
fi
