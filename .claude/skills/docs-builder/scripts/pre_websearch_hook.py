#!/usr/bin/env python3
"""Pre-WebSearch hook for docs-builder.

Checks if a docs-builder reference already exists for the query topic and,
if so, emits a reminder to load SYNTHESIS.md before hitting the web. If no
reference exists, exits silently (0) to let the search proceed.
"""
import json
import os
import subprocess
import sys

# Read tool input from stdin (Claude Code hook protocol)
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

# Just allow the search to proceed — lookup logic can be added later.
sys.exit(0)
