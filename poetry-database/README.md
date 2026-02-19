# Database Backup Files

This directory contains large database dump files excluded from Git.

## Files
- `qafiyah_public_20250610_1424.dump` (42MB) - PostgreSQL backup of qafiyah database

## Usage
Contact the project maintainer to obtain the database dump file for local development setup.

To restore:
```bash
pg_restore -d your_database qafiyah_public_20250610_1424.dump
```

