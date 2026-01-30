#!/bin/bash
# Syncs Swift template files from packages/create-target/templates/ into e2e/fixture/targets/
# Run this after updating templates or upgrading SDK versions.
# Skips expo-target.config.* files (those are maintained separately for e2e).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/../../create-target/templates"
TARGETS_DIR="$SCRIPT_DIR/fixture/targets"

if [ ! -d "$TEMPLATES_DIR" ]; then
  echo "Error: Templates directory not found at $TEMPLATES_DIR"
  exit 1
fi

SYNCED=0

for target_dir in "$TARGETS_DIR"/*/; do
  target_name="$(basename "$target_dir")"
  template_dir="$TEMPLATES_DIR/$target_name"

  if [ ! -d "$template_dir" ]; then
    echo "SKIP: No template found for $target_name"
    continue
  fi

  # Copy all files except expo-target.config.* from template to fixture
  find "$template_dir" -type f | while read -r src_file; do
    rel_path="${src_file#$template_dir/}"

    # Skip config files
    case "$rel_path" in
      expo-target.config.*) continue ;;
    esac

    dest_file="$target_dir/$rel_path"
    dest_dir="$(dirname "$dest_file")"
    mkdir -p "$dest_dir"
    cp "$src_file" "$dest_file"
  done

  echo "SYNCED: $target_name"
  SYNCED=$((SYNCED + 1))
done

echo ""
echo "Synced $SYNCED targets from templates."
echo "Note: clip/AppDelegate.swift uses a simplified (non-RN) version for e2e."
echo "You may need to manually update it if the template changes significantly."
