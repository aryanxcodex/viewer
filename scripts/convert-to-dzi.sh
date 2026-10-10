#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 data/raw/sample.svs slide-001" >&2
  exit 1
fi

input=$1
id=$2
out="public/slides/$id"
mkdir -p "$out"
vips dzsave "$input" "$out/slide" --layout dz --tile-size 254 --overlap 1 --suffix '.jpg[Q=85]'
echo "Created $out/slide.dzi and $out/slide_files/"
