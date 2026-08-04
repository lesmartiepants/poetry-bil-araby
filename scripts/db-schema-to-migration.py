#!/usr/bin/env python3
"""Turn a schema-only pg_dump into an idempotent Supabase migration.

Driven by scripts/db-dump-schema.sh; not meant to be run on its own.
"""
import re
import sys
from pathlib import Path

HEADER = (Path(__file__).parent / "db-base-schema-header.sql").read_text(encoding="utf-8")

src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding="utf-8").read()

# Drop psql meta-commands (\restrict / \unrestrict, PG 17.6+) and the SET preamble.
lines = []
for ln in text.split("\n"):
    s = ln.strip()
    if s.startswith("\\restrict") or s.startswith("\\unrestrict"):
        continue
    if re.match(r"^SET (statement_timeout|lock_timeout|idle_in_transaction_session_timeout|"
                r"transaction_timeout|client_encoding|standard_conforming_strings|"
                r"check_function_bodies|xmloption|client_min_messages|row_security|"
                r"default_tablespace|default_table_access_method)", s):
        continue
    if s.startswith("SELECT pg_catalog.set_config('search_path'"):
        continue
    if s.startswith("-- Dumped from") or s.startswith("-- Dumped by"):
        continue
    if s in ("-- PostgreSQL database dump", "-- PostgreSQL database dump complete"):
        continue
    lines.append(ln)
text = "\n".join(lines)

# Collapse runs of blank lines.
text = re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"

# --- idempotency rewrites -------------------------------------------------
text = re.sub(r"^CREATE SCHEMA public;", "CREATE SCHEMA IF NOT EXISTS public;", text, flags=re.M)
text = re.sub(r"^CREATE TABLE (public\.)", r"CREATE TABLE IF NOT EXISTS \1", text, flags=re.M)
text = re.sub(r"^CREATE SEQUENCE (public\.)", r"CREATE SEQUENCE IF NOT EXISTS \1", text, flags=re.M)
text = re.sub(r"^CREATE (UNIQUE )?INDEX ", r"CREATE \1INDEX IF NOT EXISTS ", text, flags=re.M)
text = re.sub(r"^CREATE FUNCTION ", "CREATE OR REPLACE FUNCTION ", text, flags=re.M)
text = re.sub(r"^CREATE VIEW ", "CREATE OR REPLACE VIEW ", text, flags=re.M)
text = re.sub(r"^CREATE MATERIALIZED VIEW (public\.)",
              r"CREATE MATERIALIZED VIEW IF NOT EXISTS \1", text, flags=re.M)
text = re.sub(r"^CREATE TRIGGER ", "CREATE OR REPLACE TRIGGER ", text, flags=re.M)

# CREATE TYPE ... ; -> guarded DO block (no IF NOT EXISTS for types).
def guard_type(m):
    body = m.group(0).rstrip()
    inner = body.replace("$", "$")
    return ("DO $guard$ BEGIN\n    " + inner.replace("\n", "\n    ") +
            "\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $guard$;")

text = re.sub(r"^CREATE TYPE .*?;\s*$", guard_type, text, flags=re.M | re.S)

# ALTER TABLE ... ADD CONSTRAINT ... ; -> guarded DO block.
def guard_constraint(m):
    body = m.group(0).rstrip()
    return ("DO $guard$ BEGIN\n    " + body.replace("\n", "\n    ") +
            "\nEXCEPTION WHEN duplicate_object OR duplicate_table "
            "OR invalid_table_definition THEN NULL;\nEND $guard$;")

text = re.sub(r"^ALTER TABLE (?:ONLY )?public\.[\s\S]*?ADD CONSTRAINT[\s\S]*?;\s*$",
              guard_constraint, text, flags=re.M)

# CREATE POLICY -> drop first so re-runs replace cleanly.
def guard_policy(m):
    name, table = m.group(1), m.group(2)
    return f'DROP POLICY IF EXISTS {name} ON {table};\n{m.group(0)}'

text = re.sub(r'^CREATE POLICY ("(?:[^"]+)"|\S+) ON (public\.\S+)', guard_policy, text, flags=re.M)

out = HEADER + text + "\nRESET check_function_bodies;\n"
open(dst, "w", encoding="utf-8").write(out)
print("wrote", dst, len(out.split("\n")), "lines")
