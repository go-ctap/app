#!/bin/sh
set -eu

if [ "${1:-}" = "--appimage-extract-and-run" ]; then
  shift
fi

wrapper_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export PATH="${wrapper_dir}:${PATH}"

exec "${wrapper_dir}/linuxdeploy-extracted/AppRun" "$@"
