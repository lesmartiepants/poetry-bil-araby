#!/usr/bin/env bash
# Install the CLI used by the Render API to attach bug-report screenshots.
set -euo pipefail

version=2.105.0
case "$(uname -s)/$(uname -m)" in
  Linux/x86_64)
    arch=amd64
    checksum=79e7ab5db738c48777b696e374f8b428f0647debfb424f44d2f426370407fe2f
    ;;
  Linux/aarch64)
    arch=arm64
    checksum=b1278c75107423d818f1937fd92cafc9e5e9b606631568f68d7fb816f5885a02
    ;;
  *)
    echo 'This installer is for the Linux API deployment.' >&2
    exit 1
    ;;
esac

destination=${1:-.render-bin}
temporary=$(mktemp -d)
trap 'rm -rf -- "$temporary"' EXIT
release="gh_${version}_linux_${arch}"
archive="$temporary/$release.tar.gz"

curl --fail --silent --show-error --location --retry 3 --max-time 120 \
  "https://github.com/cli/cli/releases/download/v$version/$release.tar.gz" -o "$archive"
printf '%s  %s\n' "$checksum" "$archive" | sha256sum --check -
tar -xzf "$archive" -C "$temporary" "$release/bin/gh"
install -D -m 0755 "$temporary/$release/bin/gh" "$destination/gh"
