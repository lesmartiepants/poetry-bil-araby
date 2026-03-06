Supabase CLI
The Supabase CLI provides tools to develop your project locally and deploy to the Supabase Platform.
The CLI is still under development, but it contains all the functionality for working with your Supabase projects and the Supabase Platform.

Run Supabase locally: supabase init and supabase start
Manage database migrations: supabase migration
CI/CD for releasing to production: supabase db push
Manage your Supabase projects: supabase projects
Generate types directly from your database schema: supabase gen types
A community-supported GitHub Action to generate TypeScript types
Shell autocomplete: supabase completion
A community-supported Fig autocomplete spec for macOS terminal
Additional links#
Install the Supabase CLI
Source code
Known bugs and issues
Supabase CLI v1 and Management API Beta
Video: Announcing CLI V1 and Management API Beta
Global flags
Supabase CLI supports global flags for every command.

Flags
--create-ticket
Optional
no type
create a support ticket for any CLI error

--debug
Optional
no type
output debug logs to stderr

--dns-resolver <[ native | https ]>
Optional
no type
lookup domain names using the specified resolver

--experimental
Optional
no type
enable experimental features

-h, --help
Optional
no type
help for supabase

--network-id <string>
Optional
no type
use the specified docker network instead of a generated one

-o, --output <[ env | pretty | json | toml | yaml ]>
Optional
no type
output format of status variables

--profile <string>
Optional
no type
use a specific profile for connecting to Supabase API

--workdir <string>
Optional
no type
path to a Supabase project directory

--yes
Optional
no type
answer yes to all prompts

supabase bootstrap
Usage
supabase bootstrap [template] [flags]
Flags
-p, --password <string>
Optional
Password to your remote Postgres database.

supabase init
Initialize configurations for Supabase local development.

A supabase/config.toml file is created in your current working directory. This configuration is specific to each local project.

You may override the directory path by specifying the SUPABASE_WORKDIR environment variable or --workdir flag.

In addition to config.toml, the supabase directory may also contain other Supabase objects, such as migrations, functions, tests, etc.

Usage
supabase init [flags]
Flags
--force
Optional
Overwrite existing supabase/config.toml.

--use-orioledb
Optional
Use OrioleDB storage engine for Postgres.

--with-intellij-settings
Optional
Generate IntelliJ IDEA settings for Deno.

--with-vscode-settings
Optional
Generate VS Code settings for Deno.

Basic usage
Initialize from an existing directory
supabase init
Response
Finished supabase init.
supabase login
Connect the Supabase CLI to your Supabase account by logging in with your personal access token.

Your access token is stored securely in native credentials storage. If native credentials storage is unavailable, it will be written to a plain text file at ~/.supabase/access-token.

If this behavior is not desired, such as in a CI environment, you may skip login by specifying the SUPABASE_ACCESS_TOKEN environment variable in other commands.

The Supabase CLI uses the stored token to access Management APIs for projects, functions, secrets, etc.

Usage
supabase login [flags]
Flags
--name <string>
Optional
Name that will be used to store token in your settings

--no-browser
Optional
Do not open browser automatically

--token <string>
Optional
Use provided token instead of automatic login flow

Basic usage
supabase login
Response
You can generate an access token from https://supabase.com/dashboard/account/tokens
Enter your access token: sbp_****************************************
Finished supabase login.
supabase link
Link your local development project to a hosted Supabase project.

PostgREST configurations are fetched from the Supabase platform and validated against your local configuration file.

Optionally, database settings can be validated if you provide a password. Your database password is saved in native credentials storage if available.

If you do not want to be prompted for the database password, such as in a CI environment, you may specify it explicitly via the SUPABASE_DB_PASSWORD environment variable.

Some commands like db dump, db push, and db pull require your project to be linked first.

Usage
supabase link [flags]
Flags
-p, --password <string>
Optional
Password to your remote Postgres database.

--project-ref <string>
Optional
Project ref of the Supabase project.

--skip-pooler
Optional
Use direct connection instead of pooler.

Basic usage
Link without database password
Link using DNS-over-HTTPS resolver
supabase link --project-ref ********************
Response
Enter your database password (or leave blank to skip): ********
Finished supabase link.
supabase start
Starts the Supabase local development stack.

Requires supabase/config.toml to be created in your current working directory by running supabase init.

All service containers are started by default. You can exclude those not needed by passing in -x flag. To exclude multiple containers, either pass in a comma separated string, such as -x gotrue,imgproxy, or specify -x flag multiple times.

It is recommended to have at least 7GB of RAM to start all services.

Health checks are automatically added to verify the started containers. Use --ignore-health-check flag to ignore these errors.

Usage
supabase start [flags]
Flags
-x, --exclude <strings>
Optional
Names of containers to not start. [gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor]

--ignore-health-check
Optional
Ignore unhealthy services and exit 0

Basic usage
Start containers without studio and imgproxy
Ignore service health checks
supabase start
Response
Creating custom roles supabase/roles.sql...
Applying migration 20220810154536_employee.sql...
Seeding data supabase/seed.sql...
Started supabase local development setup.
supabase stop
Stops the Supabase local development stack.

Requires supabase/config.toml to be created in your current working directory by running supabase init.

All Docker resources are maintained across restarts. Use --no-backup flag to reset your local development data between restarts.

Use the --all flag to stop all local Supabase projects instances on the machine. Use with caution with --no-backup as it will delete all supabase local projects data.

Usage
supabase stop [flags]
Flags
--all
Optional
Stop all local Supabase instances from all projects across the machine.

--no-backup
Optional
Deletes all data volumes after stopping.

--project-id <string>
Optional
Local project ID to stop.

Basic usage
Clean up local data after stopping
supabase stop
Response
Stopped supabase local development setup.
Local data are backed up to docker volume.
supabase status
Shows status of the Supabase local development stack.

Requires the local development stack to be started by running supabase start or supabase db start.

You can export the connection parameters for initializing supabase-js locally by specifying the -o env flag. Supported parameters include JWT_SECRET, ANON_KEY, and SERVICE_ROLE_KEY.

Usage
supabase status [flags]
Flags
--override-name <strings>
Optional
Override specific variable names.

Basic usage
Format status as environment variables
Customize the names of exported variables
supabase status
Response
supabase local development setup is running.
         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
supabase test
Subcommands
supabase test db
supabase test new
supabase test db
Executes pgTAP tests against the local database.

Requires the local development stack to be started by running supabase start.

Runs pg_prove in a container with unit test files volume mounted from supabase/tests directory. The test file can be suffixed by either .sql or .pg extension.

Since each test is wrapped in its own transaction, it will be individually rolled back regardless of success or failure.

Usage
supabase test db [path] ... [flags]
Flags
--db-url <string>
Optional
Tests the database specified by the connection string (must be percent-encoded).

--linked
Optional
Runs pgTAP tests on the linked project.

--local
Optional
Runs pgTAP tests on the local database.

Basic usage
supabase test db
Response
/tmp/supabase/tests/nested/order_test.pg .. ok
/tmp/supabase/tests/pet_test.sql .......... ok
All tests successful.
Files=2, Tests=2,  6 wallclock secs ( 0.03 usr  0.01 sys +  0.05 cusr  0.02 csys =  0.11 CPU)
Result: PASS
supabase test new
Usage
supabase test new <name> [flags]
Flags
-t, --template <[ pgtap ]>
Optional
Template framework to generate.

supabase gen
Automatically generates type definitions based on your Postgres database schema.

This command connects to your database (local or remote) and generates typed definitions that match your database tables, views, and stored procedures. By default, it generates TypeScript definitions, but also supports Go and Swift.

Generated types give you type safety and autocompletion when working with your database in code, helping prevent runtime errors and improving developer experience.

The types respect relationships, constraints, and custom types defined in your database schema.

Subcommands
supabase gen bearer-jwt
supabase gen signing-key
supabase gen types
supabase gen signing-key
Securely generate a private JWT signing key for use in the CLI or to import in the dashboard.

Supported algorithms:
ES256 - ECDSA with P-256 curve and SHA-256 (recommended)
RS256 - RSA with SHA-256

Usage
supabase gen signing-key [flags]
Flags
--algorithm <[ RS256 | ES256 ]>
Optional
Algorithm for signing key generation.

--append
Optional
Append new key to existing keys file instead of overwriting.

supabase gen types
Usage
supabase gen types [flags]
Flags
--db-url <string>
Optional
Generate types from a database url.

--lang <[ typescript | go | swift ]>
Optional
Output language of the generated types.

--linked
Optional
Generate types from the linked project.

--local
Optional
Generate types from the local dev database.

--postgrest-v9-compat
Optional
Generate types compatible with PostgREST v9 and below.

--project-id <string>
Optional
Generate types from a project ID.

--query-timeout <duration>
Optional
Maximum timeout allowed for the database query.

-s, --schema <strings>
Optional
Comma separated list of schema to include.

--swift-access-control <[ internal | public ]>
Optional
Access control for Swift generated types.

supabase db
Subcommands
supabase db diff
supabase db dump
supabase db lint
supabase db pull
supabase db push
supabase db reset
supabase db start
supabase db pull
Pulls schema changes from a remote database. A new migration file will be created under supabase/migrations directory.

Requires your local project to be linked to a remote database by running supabase link. For self-hosted databases, you can pass in the connection parameters using --db-url flag.

Optionally, a new row can be inserted into the migration history table to reflect the current state of the remote database.

If no entries exist in the migration history table, pg_dump will be used to capture all contents of the remote schemas you have created. Otherwise, this command will only diff schema changes against the remote database, similar to running db diff --linked.

Usage
supabase db pull [migration name] [flags]
Flags
--db-url <string>
Optional
Pulls from the database specified by the connection string (must be percent-encoded).

--linked
Optional
Pulls from the linked project.

--local
Optional
Pulls from the local database.

-p, --password <string>
Optional
Password to your remote Postgres database.

-s, --schema <strings>
Optional
Comma separated list of schema to include.

Basic usage
Local studio
Custom schemas
supabase db pull
Response
Connecting to remote database...
Schema written to supabase/migrations/20240414044403_remote_schema.sql
Update remote migration history table? [Y/n]
Repaired migration history: [20240414044403] => applied
Finished supabase db pull.
The auth and storage schemas are excluded. Run supabase db pull --schema auth,storage again to diff them.
supabase db push
Pushes all local migrations to a remote database.

Requires your local project to be linked to a remote database by running supabase link. For self-hosted databases, you can pass in the connection parameters using --db-url flag.

The first time this command is run, a migration history table will be created under supabase_migrations.schema_migrations. After successfully applying a migration, a new row will be inserted into the migration history table with timestamp as its unique id. Subsequent pushes will skip migrations that have already been applied.

If you need to mutate the migration history table, such as deleting existing entries or inserting new entries without actually running the migration, use the migration repair command.

Use the --dry-run flag to view the list of changes before applying.

Usage
supabase db push [flags]
Flags
--db-url <string>
Optional
Pushes to the database specified by the connection string (must be percent-encoded).

--dry-run
Optional
Print the migrations that would be applied, but don't actually apply them.

--include-all
Optional
Include all migrations not found on remote history table.

--include-roles
Optional
Include custom roles from supabase/roles.sql.

--include-seed
Optional
Include seed data from your config.

--linked
Optional
Pushes to the linked project.

--local
Optional
Pushes to the local database.

-p, --password <string>
Optional
Password to your remote Postgres database.

Basic usage
Self hosted
Dry run
supabase db push
Response
Linked project is up to date.
supabase db reset
Resets the local database to a clean state.

Requires the local development stack to be started by running supabase start.

Recreates the local Postgres container and applies all local migrations found in supabase/migrations directory. If test data is defined in supabase/seed.sql, it will be seeded after the migrations are run. Any other data or schema changes made during local development will be discarded.

When running db reset with --linked or --db-url flag, a SQL script is executed to identify and drop all user created entities in the remote database. Since Postgres roles are cluster level entities, any custom roles created through the dashboard or supabase/roles.sql will not be deleted by remote reset.

Usage
supabase db reset [flags]
Flags
--db-url <string>
Optional
Resets the database specified by the connection string (must be percent-encoded).

--last <uint>
Optional
Reset up to the last n migration versions.

--linked
Optional
Resets the linked project with local migrations.

--local
Optional
Resets the local database with local migrations.

--no-seed
Optional
Skip running the seed script after reset.

--version <string>
Optional
Reset up to the specified version.

Basic usage
supabase db reset
Response
Resetting database...
Initializing schema...
Applying migration 20220810154537_create_employees_table.sql...
Seeding data supabase/seed.sql...
Finished supabase db reset on branch main.
supabase db dump
Dumps contents from a remote database.

Requires your local project to be linked to a remote database by running supabase link. For self-hosted databases, you can pass in the connection parameters using --db-url flag.

Runs pg_dump in a container with additional flags to exclude Supabase managed schemas. The ignored schemas include auth, storage, and those created by extensions.

The default dump does not contain any data or custom roles. To dump those contents explicitly, specify either the --data-only and --role-only flag.

Usage
supabase db dump [flags]
Flags
--data-only
Optional
Dumps only data records.

--db-url <string>
Optional
Dumps from the database specified by the connection string (must be percent-encoded).

--dry-run
Optional
Prints the pg_dump script that would be executed.

-x, --exclude <strings>
Optional
List of schema.tables to exclude from data-only dump.

-f, --file <string>
Optional
File path to save the dumped contents.

--keep-comments
Optional
Keeps commented lines from pg_dump output.

--linked
Optional
Dumps from the linked project.

--local
Optional
Dumps from the local database.

-p, --password <string>
Optional
Password to your remote Postgres database.

--role-only
Optional
Dumps only cluster roles.

-s, --schema <strings>
Optional
Comma separated list of schema to include.

--use-copy
Optional
Use copy statements in place of inserts.

Basic usage
Role only
Data only
supabase db dump -f supabase/schema.sql
Response
Dumping schemas from remote database...
Dumped schema to supabase/schema.sql.
supabase db diff
Diffs schema changes made to the local or remote database.

Requires the local development stack to be running when diffing against the local database. To diff against a remote or self-hosted database, specify the --linked or --db-url flag respectively.

Runs djrobstep/migra in a container to compare schema differences between the target database and a shadow database. The shadow database is created by applying migrations in local supabase/migrations directory in a separate container. Output is written to stdout by default. For convenience, you can also save the schema diff as a new migration file by passing in -f flag.

By default, all schemas in the target database are diffed. Use the --schema public,extensions flag to restrict diffing to a subset of schemas.

While the diff command is able to capture most schema changes, there are cases where it is known to fail. Currently, this could happen if you schema contains:

Changes to publication
Changes to storage buckets
Views with security_invoker attributes
Usage
supabase db diff [flags]
Flags
--db-url <string>
Optional
Diffs against the database specified by the connection string (must be percent-encoded).

-f, --file <string>
Optional
Saves schema diff to a new migration file.

--linked
Optional
Diffs local migration files against the linked project.

--local
Optional
Diffs local migration files against the local database.

-s, --schema <strings>
Optional
Comma separated list of schema to include.

--use-migra
Optional
Use migra to generate schema diff.

--use-pg-schema
Optional
Use pg-schema-diff to generate schema diff.

--use-pgadmin
Optional
Use pgAdmin to generate schema diff.

Basic usage
Against linked project
For a specific schema
supabase db diff -f my_table
Response
Connecting to local database...
Creating shadow database...
Applying migration 20230425064254_remote_commit.sql...
Diffing schemas: auth,extensions,public,storage
Finished supabase db diff on branch main.
No schema changes found
supabase db lint
Lints local database for schema errors.

Requires the local development stack to be running when linting against the local database. To lint against a remote or self-hosted database, specify the --linked or --db-url flag respectively.

Runs plpgsql_check extension in the local Postgres container to check for errors in all schemas. The default lint level is warning and can be raised to error via the --level flag.

To lint against specific schemas only, pass in the --schema flag.

The --fail-on flag can be used to control when the command should exit with a non-zero status code. The possible values are:

none (default): Always exit with a zero status code, regardless of lint results.
warning: Exit with a non-zero status code if any warnings or errors are found.
error: Exit with a non-zero status code only if errors are found.
This flag is particularly useful in CI/CD pipelines where you want to fail the build based on certain lint conditions.

Usage
supabase db lint [flags]
Flags
--db-url <string>
Optional
Lints the database specified by the connection string (must be percent-encoded).

--fail-on <[ none | warning | error ]>
Optional
Error level to exit with non-zero status.

--level <[ warning | error ]>
Optional
Error level to emit.

--linked
Optional
Lints the linked project for schema errors.

--local
Optional
Lints the local database for schema errors.

-s, --schema <strings>
Optional
Comma separated list of schema to include.

Basic usage
Warnings for a specific schema
supabase db lint
Response
Linting schema: public
No schema errors found
supabase db start
Usage
supabase db start [flags]
Flags
--from-backup <string>
Optional
Path to a logical backup file.

supabase migration
Subcommands
supabase migration down
supabase migration fetch
supabase migration list
supabase migration new
supabase migration repair
supabase migration squash
supabase migration up
supabase migration new
Creates a new migration file locally.

A supabase/migrations directory will be created if it does not already exists in your current workdir. All schema migration files must be created in this directory following the pattern <timestamp>_<name>.sql.

Outputs from other commands like db diff may be piped to migration new <name> via stdin.

Usage
supabase migration new <migration name>
Basic usage
With statements piped from stdin
supabase migration new schema_test
Response
Created new migration at supabase/migrations/20230306095710_schema_test.sql.
supabase migration list
Lists migration history in both local and remote databases.

Requires your local project to be linked to a remote database by running supabase link. For self-hosted databases, you can pass in the connection parameters using --db-url flag.

Note that URL strings must be escaped according to RFC 3986.

Local migrations are stored in supabase/migrations directory while remote migrations are tracked in supabase_migrations.schema_migrations table. Only the timestamps are compared to identify any differences.

In case of discrepancies between the local and remote migration history, you can resolve them using the migration repair command.

Usage
supabase migration list [flags]
Flags
--db-url <string>
Optional
Lists migrations of the database specified by the connection string (must be percent-encoded).

--linked
Optional
Lists migrations applied to the linked project.

--local
Optional
Lists migrations applied to the local database.

-p, --password <string>
Optional
Password to your remote Postgres database.

Basic usage
Connect to self-hosted database
supabase migration list
Response
LOCAL      │     REMOTE     │     TIME (UTC)
─────────────────┼────────────────┼──────────────────────
                 │ 20230103054303 │ 2023-01-03 05:43:03
                 │ 20230103093141 │ 2023-01-03 09:31:41
  20230222032233 │                │ 2023-02-22 03:22:33
supabase migration fetch
Usage
supabase migration fetch [flags]
Flags
--db-url <string>
Optional
Fetches migrations from the database specified by the connection string (must be percent-encoded).

--linked
Optional
Fetches migration history from the linked project.

--local
Optional
Fetches migration history from the local database.

supabase migration repair
Repairs the remote migration history table.

Requires your local project to be linked to a remote database by running supabase link.

If your local and remote migration history goes out of sync, you can repair the remote history by marking specific migrations as --status applied or --status reverted. Marking as reverted will delete an existing record from the migration history table while marking as applied will insert a new record.

For example, your migration history may look like the table below, with missing entries in either local or remote.

$ supabase migration list
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────────
                   │ 20230103054303 │ 2023-01-03 05:43:03
   20230103054315  │                │ 2023-01-03 05:43:15
To reset your migration history to a clean state, first delete your local migration file.

$ rm supabase/migrations/20230103054315_remote_commit.sql

$ supabase migration list
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────────
                   │ 20230103054303 │ 2023-01-03 05:43:03
Then mark the remote migration 20230103054303 as reverted.

$ supabase migration repair 20230103054303 --status reverted
Connecting to remote database...
Repaired migration history: [20220810154537] => reverted
Finished supabase migration repair.

$ supabase migration list
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────────
Now you can run db pull again to dump the remote schema as a local migration file.

$ supabase db pull
Connecting to remote database...
Schema written to supabase/migrations/20240414044403_remote_schema.sql
Update remote migration history table? [Y/n]
Repaired migration history: [20240414044403] => applied
Finished supabase db pull.

$ supabase migration list
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────────
    20240414044403 │ 20240414044403 │ 2024-04-14 04:44:03
Usage
supabase migration repair [version] ... [flags]
Flags
--db-url <string>
Optional
Repairs migrations of the database specified by the connection string (must be percent-encoded).

--linked
Optional
Repairs the migration history of the linked project.

--local
Optional
Repairs the migration history of the local database.

-p, --password <string>
Optional
Password to your remote Postgres database.

--status <[ applied | reverted ]>
Required
Version status to update.

Mark a migration as reverted
Mark a migration as applied
supabase migration repair 20230103054303 --status reverted
Response
Repaired migration history: 20230103054303 => reverted
supabase migration squash
Squashes local schema migrations to a single migration file.

The squashed migration is equivalent to a schema only dump of the local database after applying existing migration files. This is especially useful when you want to remove repeated modifications of the same schema from your migration history.

However, one limitation is that data manipulation statements, such as insert, update, or delete, are omitted from the squashed migration. You will have to add them back manually in a new migration file. This includes cron jobs, storage buckets, and any encrypted secrets in vault.

By default, the latest <timestamp>_<name>.sql file will be updated to contain the squashed migration. You can override the target version using the --version <timestamp> flag.

If your supabase/migrations directory is empty, running supabase squash will do nothing.

Usage
supabase migration squash [flags]
Flags
--db-url <string>
Optional
Squashes migrations of the database specified by the connection string (must be percent-encoded).

--linked
Optional
Squashes the migration history of the linked project.

--local
Optional
Squashes the migration history of the local database.

-p, --password <string>
Optional
Password to your remote Postgres database.

--version <string>
Optional
Squash up to the specified version.

supabase migration up
Usage
supabase migration up [flags]
Flags
--db-url <string>
Optional
Applies migrations to the database specified by the connection string (must be percent-encoded).

--include-all
Optional
Include all migrations not found on remote history table.

--linked
Optional
Applies pending migrations to the linked project.

--local
Optional
Applies pending migrations to the local database.

supabase migration down
Usage
supabase migration down [flags]
Flags
--db-url <string>
Optional
Resets applied migrations on the database specified by the connection string (must be percent-encoded).

--last <uint>
Optional
Reset up to the last n migration versions.

--linked
Optional
Resets applied migrations on the linked project.

--local
Optional
Resets applied migrations on the local database.

supabase seed
Subcommands
supabase seed buckets
supabase seed buckets
Usage
supabase seed buckets
Flags
--linked
Optional
Seeds the linked project.

--local
Optional
Seeds the local database.

supabase inspect db
Subcommands
supabase inspect db bloat
supabase inspect db blocking
supabase inspect db calls
supabase inspect db db-stats
supabase inspect db index-stats
supabase inspect db locks
supabase inspect db long-running-queries
supabase inspect db outliers
supabase inspect db replication-slots
supabase inspect db role-stats
supabase inspect db table-stats
supabase inspect db traffic-profile
supabase inspect db vacuum-stats
supabase inspect db bloat
This command displays an estimation of table "bloat" - Due to Postgres' MVCC when data is updated or deleted new rows are created and old rows are made invisible and marked as "dead tuples". Usually the autovaccum process will asynchronously clean the dead tuples. Sometimes the autovaccum is unable to work fast enough to reduce or prevent tables from becoming bloated. High bloat can slow down queries, cause excessive IOPS and waste space in your database.

Tables with a high bloat ratio should be investigated to see if there are vacuuming is not quick enough or there are other issues.

    TYPE  │ SCHEMA NAME │        OBJECT NAME         │ BLOAT │ WASTE
  ────────┼─────────────┼────────────────────────────┼───────┼─────────────
    table │ public      │ very_bloated_table         │  41.0 │ 700 MB
    table │ public      │ my_table                   │   4.0 │ 76 MB
    table │ public      │ happy_table                │   1.0 │ 1472 kB
    index │ public      │ happy_table::my_nice_index │   0.7 │ 880 kB
Usage
supabase inspect db bloat
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db blocking
This command shows you statements that are currently holding locks and blocking, as well as the statement that is being blocked. This can be used in conjunction with inspect db locks to determine which statements need to be terminated in order to resolve lock contention.

    BLOCKED PID │ BLOCKING STATEMENT           │ BLOCKING DURATION │ BLOCKING PID │ BLOCKED STATEMENT                                                                      │ BLOCKED DURATION
  ──────────────┼──────────────────────────────┼───────────────────┼──────────────┼────────────────────────────────────────────────────────────────────────────────────────┼───────────────────
    253         │ select count(*) from mytable │ 00:00:03.838314   │        13495 │ UPDATE "mytable" SET "updated_at" = '2023─08─03 14:07:04.746688' WHERE "id" = 83719341 │ 00:00:03.821826
Usage
supabase inspect db blocking
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db calls
This command is much like the supabase inspect db outliers command, but ordered by the number of times a statement has been called.

You can use this information to see which queries are called most often, which can potentially be good candidates for optimisation.


                        QUERY                      │ TOTAL EXECUTION TIME │ PROPORTION OF TOTAL EXEC TIME │ NUMBER CALLS │  SYNC IO TIME
  ─────────────────────────────────────────────────┼──────────────────────┼───────────────────────────────┼──────────────┼──────────────────
    SELECT * FROM users WHERE id = $1              │ 14:50:11.828939      │ 89.8%                         │  183,389,757 │ 00:00:00.002018
    SELECT * FROM user_events                      │ 01:20:23.466633      │ 1.4%                          │       78,325 │ 00:00:00
    INSERT INTO users (email, name) VALUES ($1, $2)│ 00:40:11.616882      │ 0.8%                          │       54,003 │ 00:00:00.000322

Usage
supabase inspect db calls
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db db-stats
Usage
supabase inspect db db-stats
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db index-stats
Usage
supabase inspect db index-stats
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db locks
This command displays queries that have taken out an exclusive lock on a relation. Exclusive locks typically prevent other operations on that relation from taking place, and can be a cause of "hung" queries that are waiting for a lock to be granted.

If you see a query that is hanging for a very long time or causing blocking issues you may consider killing the query by connecting to the database and running SELECT pg_cancel_backend(PID); to cancel the query. If the query still does not stop you can force a hard stop by running SELECT pg_terminate_backend(PID);

     PID   │ RELNAME │ TRANSACTION ID │ GRANTED │                  QUERY                  │   AGE
  ─────────┼─────────┼────────────────┼─────────┼─────────────────────────────────────────┼───────────
    328112 │ null    │              0 │ t       │ SELECT * FROM logs;                     │ 00:04:20
Usage
supabase inspect db locks
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db long-running-queries
This command displays currently running queries, that have been running for longer than 5 minutes, descending by duration. Very long running queries can be a source of multiple issues, such as preventing DDL statements completing or vacuum being unable to update relfrozenxid.

  PID  │     DURATION    │                                         QUERY
───────┼─────────────────┼───────────────────────────────────────────────────────────────────────────────────────
 19578 | 02:29:11.200129 | EXPLAIN SELECT  "students".* FROM "students"  WHERE "students"."id" = 1450645 LIMIT 1
 19465 | 02:26:05.542653 | EXPLAIN SELECT  "students".* FROM "students"  WHERE "students"."id" = 1889881 LIMIT 1
 19632 | 02:24:46.962818 | EXPLAIN SELECT  "students".* FROM "students"  WHERE "students"."id" = 1581884 LIMIT 1
Usage
supabase inspect db long-running-queries
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db outliers
This command displays statements, obtained from pg_stat_statements, ordered by the amount of time to execute in aggregate. This includes the statement itself, the total execution time for that statement, the proportion of total execution time for all statements that statement has taken up, the number of times that statement has been called, and the amount of time that statement spent on synchronous I/O (reading/writing from the file system).

Typically, an efficient query will have an appropriate ratio of calls to total execution time, with as little time spent on I/O as possible. Queries that have a high total execution time but low call count should be investigated to improve their performance. Queries that have a high proportion of execution time being spent on synchronous I/O should also be investigated.


                 QUERY                   │ EXECUTION TIME   │ PROPORTION OF EXEC TIME │ NUMBER CALLS │ SYNC IO TIME
─────────────────────────────────────────┼──────────────────┼─────────────────────────┼──────────────┼───────────────
 SELECT * FROM archivable_usage_events.. │ 154:39:26.431466 │ 72.2%                   │ 34,211,877   │ 00:00:00
 COPY public.archivable_usage_events (.. │ 50:38:33.198418  │ 23.6%                   │ 13           │ 13:34:21.00108
 COPY public.usage_events (id, reporte.. │ 02:32:16.335233  │ 1.2%                    │ 13           │ 00:34:19.784318
 INSERT INTO usage_events (id, retaine.. │ 01:42:59.436532  │ 0.8%                    │ 12,328,187   │ 00:00:00
 SELECT * FROM usage_events WHERE (alp.. │ 01:18:10.754354  │ 0.6%                    │ 102,114,301  │ 00:00:00
Usage
supabase inspect db outliers
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db replication-slots
This command shows information about logical replication slots that are setup on the database. It shows if the slot is active, the state of the WAL sender process ('startup', 'catchup', 'streaming', 'backup', 'stopping') the replication client address and the replication lag in GB.

This command is useful to check that the amount of replication lag is as low as possible, replication lag can occur due to network latency issues, slow disk I/O, long running transactions or lack of ability for the subscriber to consume WAL fast enough.

                       NAME                    │ ACTIVE │ STATE   │ REPLICATION CLIENT ADDRESS │ REPLICATION LAG GB
  ─────────────────────────────────────────────┼────────┼─────────┼────────────────────────────┼─────────────────────
    supabase_realtime_replication_slot         │ t      │ N/A     │ N/A                        │                  0
    datastream                                 │ t      │ catchup │ 24.201.24.106              │                 45
Usage
supabase inspect db replication-slots
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db role-stats
Usage
supabase inspect db role-stats
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db table-stats
Usage
supabase inspect db table-stats
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db traffic-profile
This command analyzes table I/O patterns to show read/write activity ratios based on block-level operations. It combines data from PostgreSQL's pg_stat_user_tables (for tuple operations) and pg_statio_user_tables (for block I/O) to categorize each table's workload profile.

The command classifies tables into categories:

Read-Heavy - Read operations are more than 5x write operations (e.g., 1:10, 1:50)
Write-Heavy - Write operations are more than 20% of read operations (e.g., 1:2, 1:4, 2:1, 10:1)
Balanced - Mixed workload where writes are between 20% and 500% of reads
Read-Only - Only read operations detected
Write-Only - Only write operations detected
SCHEMA │ TABLE        │ BLOCKS READ │ WRITE TUPLES │ BLOCKS WRITE │ ACTIVITY RATIO
───────┼──────────────┼─────────────┼──────────────┼──────────────┼────────────────────
public │ user_events  │     450,234 │     9,004,680│       23,450 │ 20:1 (Write-Heavy)
public │ users        │      89,203 │        12,451│        1,203 │ 7.2:1 (Read-Heavy)
public │ sessions     │      15,402 │        14,823│        2,341 │ ≈1:1 (Balanced)
public │ cache_data   │     123,456 │             0│            0 │ Read-Only
auth   │ audit_logs   │           0 │        98,234│       12,341 │ Write-Only
Note: This command only displays tables that have had both read and write activity. Tables with no I/O operations are not shown. The classification ratio threshold (default: 5:1) determines when a table is considered "heavy" in one direction versus balanced.

Usage
supabase inspect db traffic-profile
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db vacuum-stats
This shows you stats about the vacuum activities for each table. Due to Postgres' MVCC when data is updated or deleted new rows are created and old rows are made invisible and marked as "dead tuples". Usually the autovaccum process will aysnchronously clean the dead tuples.

The command lists when the last vacuum and last auto vacuum took place, the row count on the table as well as the count of dead rows and whether autovacuum is expected to run or not. If the number of dead rows is much higher than the row count, or if an autovacuum is expected but has not been performed for some time, this can indicate that autovacuum is not able to keep up and that your vacuum settings need to be tweaked or that you require more compute or disk IOPS to allow autovaccum to complete.

        SCHEMA        │              TABLE               │ LAST VACUUM │ LAST AUTO VACUUM │      ROW COUNT       │ DEAD ROW COUNT │ EXPECT AUTOVACUUM?
──────────────────────┼──────────────────────────────────┼─────────────┼──────────────────┼──────────────────────┼────────────────┼─────────────────────
 auth                 │ users                            │             │ 2023-06-26 12:34 │               18,030 │              0 │ no
 public               │ profiles                         │             │ 2023-06-26 23:45 │               13,420 │             28 │ no
 public               │ logs                             │             │ 2023-06-26 01:23 │            1,313,033 │      3,318,228 │ yes
 storage              │ objects                          │             │                  │             No stats │              0 │ no
 storage              │ buckets                          │             │                  │             No stats │              0 │ no
 supabase_migrations  │ schema_migrations                │             │                  │             No stats │              0 │ no

Usage
supabase inspect db vacuum-stats
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect report
Usage
supabase inspect report [flags]
Flags
--output-dir <string>
Optional
Path to save CSV files in

--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase orgs
Subcommands
supabase orgs create
supabase orgs list
supabase orgs create
Create an organization for the logged-in user.

Usage
supabase orgs create
supabase orgs list
List all organizations the logged-in user belongs.

Usage
supabase orgs list
supabase projects
Provides tools for creating and managing your Supabase projects.

This command group allows you to list all projects in your organizations, create new projects, delete existing projects, and retrieve API keys. These operations help you manage your Supabase infrastructure programmatically without using the dashboard.

Project management via CLI is especially useful for automation scripts and when you need to provision environments in a repeatable way.

Subcommands
supabase projects api-keys
supabase projects create
supabase projects delete
supabase projects list
supabase projects create
Usage
supabase projects create [project name] [flags]
Flags
--db-password <string>
Optional
Database password of the project.

--org-id <string>
Optional
Organization ID to create the project in.

--region <string>
Optional
Select a region close to you for the best performance.

--size <string>
Optional
Select a desired instance size for your project.

supabase projects list
List all Supabase projects the logged-in user can access.

Usage
supabase projects list
supabase projects api-keys
Usage
supabase projects api-keys [flags]
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase projects delete
Usage
supabase projects delete [ref]
supabase config
Subcommands
supabase config push
supabase config push
Updates the configurations of a linked Supabase project with the local supabase/config.toml file.

This command allows you to manage project configuration as code by defining settings locally and then pushing them to your remote project.

Usage
supabase config push
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches
Subcommands
supabase branches create
supabase branches delete
supabase branches get
supabase branches list
supabase branches pause
supabase branches unpause
supabase branches update
supabase branches create
Create a preview branch for the linked project.

Usage
supabase branches create [name] [flags]
Flags
--notify-url <string>
Optional
URL to notify when branch is active healthy.

--persistent
Optional
Whether to create a persistent branch.

--region <string>
Optional
Select a region to deploy the branch database.

--size <string>
Optional
Select a desired instance size for the branch database.

--with-data
Optional
Whether to clone production data to the branch database.

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches list
List all preview branches of the linked project.

Usage
supabase branches list
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches get
Retrieve details of the specified preview branch.

Usage
supabase branches get [name]
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches update
Update a preview branch by its name or ID.

Usage
supabase branches update [name] [flags]
Flags
--git-branch <string>
Optional
Change the associated git branch.

--name <string>
Optional
Rename the preview branch.

--notify-url <string>
Optional
URL to notify when branch is active healthy.

--persistent
Optional
Switch between ephemeral and persistent branch.

--status <string>
Optional
Override the current branch status.

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches pause
Usage
supabase branches pause [name]
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches unpause
Usage
supabase branches unpause [name]
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches delete
Delete a preview branch by its name or ID.

Usage
supabase branches delete [name]
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase functions
Manage Supabase Edge Functions.

Supabase Edge Functions are server-less functions that run close to your users.

Edge Functions allow you to execute custom server-side code without deploying or scaling a traditional server. They're ideal for handling webhooks, custom API endpoints, data validation, and serving personalized content.

Edge Functions are written in TypeScript and run on Deno compatible edge runtime, which is a secure runtime with no package management needed, fast cold starts, and built-in security.

Subcommands
supabase functions delete
supabase functions deploy
supabase functions download
supabase functions list
supabase functions new
supabase functions serve
supabase functions new
Creates a new Edge Function with boilerplate code in the supabase/functions directory.

This command generates a starter TypeScript file with the necessary Deno imports and a basic function structure. The function is created as a new directory with the name you specify, containing an index.ts file with the function code.

After creating the function, you can edit it locally and then use supabase functions serve to test it before deploying with supabase functions deploy.

Usage
supabase functions new <Function name>
supabase functions list
List all Functions in the linked Supabase project.

Usage
supabase functions list [flags]
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase functions download
Download the source code for a Function from the linked Supabase project.

Usage
supabase functions download <Function name> [flags]
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

--use-api
Optional
Unbundle functions server-side without using Docker.

supabase functions serve
Serve all Functions locally.

supabase functions serve command includes additional flags to assist developers in debugging Edge Functions via the v8 inspector protocol, allowing for debugging via Chrome DevTools, VS Code, and IntelliJ IDEA for example. Refer to the docs guide for setup instructions.

--inspect

Alias of --inspect-mode brk.
--inspect-mode [ run | brk | wait ]

Activates the inspector capability.
run mode simply allows a connection without additional behavior. It is not ideal for short scripts, but it can be useful for long-running scripts where you might occasionally want to set breakpoints.
brk mode same as run mode, but additionally sets a breakpoint at the first line to pause script execution before any code runs.
wait mode similar to brk mode, but instead of setting a breakpoint at the first line, it pauses script execution until an inspector session is connected.
--inspect-main

Can only be used when one of the above two flags is enabled.
By default, creating an inspector session for the main worker is not allowed, but this flag allows it.
Other behaviors follow the inspect-mode flag mentioned above.
Additionally, the following properties can be customized via supabase/config.toml under edge_runtime section.

inspector_port
The port used to listen to the Inspector session, defaults to 8083.
policy
A value that indicates how the edge-runtime should forward incoming HTTP requests to the worker.
per_worker allows multiple HTTP requests to be forwarded to a worker that has already been created.
oneshot will force the worker to process a single HTTP request and then exit. (Debugging purpose, This is especially useful if you want to reflect changes you've made immediately.)
Usage
supabase functions serve [flags]
Flags
--env-file <string>
Optional
Path to an env file to be populated to the Function environment.

--import-map <string>
Optional
Path to import map file.

--inspect
Optional
Alias of --inspect-mode brk.

--inspect-main
Optional
Allow inspecting the main worker.

--inspect-mode <[ run | brk | wait ]>
Optional
Activate inspector capability for debugging.

--no-verify-jwt
Optional
Disable JWT verification for the Function.

supabase functions deploy
Deploy a Function to the linked Supabase project.

Usage
supabase functions deploy [Function name] [flags]
Flags
--import-map <string>
Optional
Path to import map file.

-j, --jobs <uint>
Optional
Maximum number of parallel jobs.

--no-verify-jwt
Optional
Disable JWT verification for the Function.

--project-ref <string>
Optional
Project ref of the Supabase project.

--prune
Optional
Delete Functions that exist in Supabase project but not locally.

--use-api
Optional
Bundle functions server-side without using Docker.

supabase functions delete
Delete a Function from the linked Supabase project. This does NOT remove the Function locally.

Usage
supabase functions delete <Function name> [flags]
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase secrets
Provides tools for managing environment variables and secrets for your Supabase project.

This command group allows you to set, unset, and list secrets that are securely stored and made available to Edge Functions as environment variables.

Secrets management through the CLI is useful for:

Setting environment-specific configuration
Managing sensitive credentials securely
Secrets can be set individually or loaded from .env files for convenience.

Subcommands
supabase secrets list
supabase secrets set
supabase secrets unset
supabase secrets set
Set a secret(s) to the linked Supabase project.

Usage
supabase secrets set <NAME=VALUE> ... [flags]
Flags
--env-file <string>
Optional
Read secrets from a .env file.

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase secrets list
List all secrets in the linked project.

Usage
supabase secrets list
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase secrets unset
Unset a secret(s) from the linked Supabase project.

Usage
supabase secrets unset [NAME] ...
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase storage
Subcommands
supabase storage cp
supabase storage ls
supabase storage mv
supabase storage rm
supabase storage ls
Usage
supabase storage ls [path] [flags]
Flags
-r, --recursive
Optional
Recursively list a directory.

--experimental
Required
enable experimental features

--linked
Optional
Connects to Storage API of the linked project.

--local
Optional
Connects to Storage API of the local database.

supabase storage cp
Relies on standard uploads to move files between local and remote storage. Not suitable for moving files over 6MB in size.

Usage
supabase storage cp <src> <dst> [flags]
Flags
--cache-control <string>
Optional
Custom Cache-Control header for HTTP upload.

--content-type <string>
Optional
Custom Content-Type header for HTTP upload.

-j, --jobs <uint>
Optional
Maximum number of parallel jobs.

-r, --recursive
Optional
Recursively copy a directory.

--experimental
Required
enable experimental features

--linked
Optional
Connects to Storage API of the linked project.

--local
Optional
Connects to Storage API of the local database.

Upload file to bucket
Upload file to folder
Upload folder to bucket
Download bucket
supabase storage cp -r path/to/file ss:///bucket_name --experimental
Response
Uploading: /path/to/file/example.txt => /bucket_name/example.txt
supabase storage mv
Usage
supabase storage mv <src> <dst> [flags]
Flags
-r, --recursive
Optional
Recursively move a directory.

--experimental
Required
enable experimental features

--linked
Optional
Connects to Storage API of the linked project.

--local
Optional
Connects to Storage API of the local database.

supabase storage rm
Usage
supabase storage rm <file> ... [flags]
Flags
-r, --recursive
Optional
Recursively remove a directory.

--experimental
Required
enable experimental features

--linked
Optional
Connects to Storage API of the linked project.

--local
Optional
Connects to Storage API of the local database.

supabase sso
Subcommands
supabase sso add
supabase sso info
supabase sso list
supabase sso remove
supabase sso show
supabase sso update
supabase sso add
Add and configure a new connection to a SSO identity provider to your Supabase project.

Usage
supabase sso add [flags]
Flags
--attribute-mapping-file <string>
Optional
File containing a JSON mapping between SAML attributes to custom JWT claims.

--domains <strings>
Optional
Comma separated list of email domains to associate with the added identity provider.

--metadata-file <string>
Optional
File containing a SAML 2.0 Metadata XML document describing the identity provider.

--metadata-url <string>
Optional
URL pointing to a SAML 2.0 Metadata XML document describing the identity provider.

--name-id-format <string>
Optional
URI reference representing the classification of string-based identifier information.

--skip-url-validation
Optional
Whether local validation of the SAML 2.0 Metadata URL should not be performed.

-t, --type <[ saml ]>
Required
Type of identity provider (according to supported protocol).

--project-ref <string>
Optional
Project ref of the Supabase project.

Add with Metadata URL
Add with Metadata File
supabase sso add \
  --project-ref abcdefgijklmnopqrst \
  --type saml \
  --metadata-url 'https://...' \
  --domains company.com
Response
Information about the added identity provider. You can use
company.com as the domain name on the frontend side to initiate a SSO
request to the identity provider.
supabase sso list
List all connections to a SSO identity provider to your Supabase project.

Usage
supabase sso list
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase sso show
Provides the information about an established connection to an identity provider. You can use --metadata to obtain the raw SAML 2.0 Metadata XML document stored in your project's configuration.

Usage
supabase sso show <provider-id> [flags]
Flags
--metadata
Optional
Show SAML 2.0 XML Metadata only

--project-ref <string>
Optional
Project ref of the Supabase project.

Show information
Get raw SAML 2.0 Metadata XML
supabase sso show 6df4d73f-bf21-405f-a084-b11adf19fea5 \
  --project-ref abcdefghijklmnopqrst
Response
Information about the identity provider in pretty output.
supabase sso info
Returns all of the important SSO information necessary for your project to be registered with a SAML 2.0 compatible identity provider.

Usage
supabase sso info
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

Show project information
supabase sso info --project-ref abcdefghijklmnopqrst
Response
Information about your project's SAML 2.0 configuration.
supabase sso update
Update the configuration settings of a already added SSO identity provider.

Usage
supabase sso update <provider-id> [flags]
Flags
--add-domains <strings>
Optional
Add this comma separated list of email domains to the identity provider.

--attribute-mapping-file <string>
Optional
File containing a JSON mapping between SAML attributes to custom JWT claims.

--domains <strings>
Optional
Replace domains with this comma separated list of email domains.

--metadata-file <string>
Optional
File containing a SAML 2.0 Metadata XML document describing the identity provider.

--metadata-url <string>
Optional
URL pointing to a SAML 2.0 Metadata XML document describing the identity provider.

--name-id-format <string>
Optional
URI reference representing the classification of string-based identifier information.

--remove-domains <strings>
Optional
Remove this comma separated list of email domains from the identity provider.

--skip-url-validation
Optional
Whether local validation of the SAML 2.0 Metadata URL should not be performed.

--project-ref <string>
Optional
Project ref of the Supabase project.

Replace domains
Add an additional domain
Remove a domain
supabase sso update 6df4d73f-bf21-405f-a084-b11adf19fea5 \
  --project-ref abcdefghijklmnopqrst \
  --domains new-company.com,new-company.net
Response
Information about the updated provider.
supabase sso remove
Remove a connection to an already added SSO identity provider. Removing the provider will prevent existing users from logging in. Please treat this command with care.

Usage
supabase sso remove <provider-id>
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

Remove a provider
supabase sso remove 6df4d73f-bf21-405f-a084-b11adf19fea5 \
  --project-ref abcdefghijklmnopqrst
Response
Information about the removed identity provider. It's a good idea to
save this in case you need it later on.
supabase domains
Manage custom domain names for Supabase projects.

Use of custom domains and vanity subdomains is mutually exclusive.

Subcommands
supabase domains activate
supabase domains create
supabase domains delete
supabase domains get
supabase domains reverify
supabase domains activate
Activates the custom hostname configuration for a project.

This reconfigures your Supabase project to respond to requests on your custom hostname.

After the custom hostname is activated, your project's third-party auth providers will no longer function on the Supabase-provisioned subdomain. Please refer to Prepare to activate your domain section in our documentation to learn more about the steps you need to follow.

Usage
supabase domains activate
Flags
--include-raw-output
Optional
Include raw output (useful for debugging).

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase domains create
Create a custom hostname for your Supabase project.

Expects your custom hostname to have a CNAME record to your Supabase project's subdomain.

Usage
supabase domains create [flags]
Flags
--custom-hostname <string>
Optional
The custom hostname to use for your Supabase project.

--include-raw-output
Optional
Include raw output (useful for debugging).

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase domains get
Retrieve the custom hostname config for your project, as stored in the Supabase platform.

Usage
supabase domains get
Flags
--include-raw-output
Optional
Include raw output (useful for debugging).

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase domains reverify
Usage
supabase domains reverify
Flags
--include-raw-output
Optional
Include raw output (useful for debugging).

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase domains delete
Usage
supabase domains delete
Flags
--include-raw-output
Optional
Include raw output (useful for debugging).

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase vanity-subdomains
Manage vanity subdomains for Supabase projects.

Usage of vanity subdomains and custom domains is mutually exclusive.

Subcommands
supabase vanity-subdomains activate
supabase vanity-subdomains check-availability
supabase vanity-subdomains delete
supabase vanity-subdomains get
supabase vanity-subdomains activate
Activate a vanity subdomain for your Supabase project.

This reconfigures your Supabase project to respond to requests on your vanity subdomain.
After the vanity subdomain is activated, your project's auth services will no longer function on the {project-ref}.{supabase-domain} hostname.

Usage
supabase vanity-subdomains activate [flags]
Flags
--desired-subdomain <string>
Optional
The desired vanity subdomain to use for your Supabase project.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase vanity-subdomains get
Usage
supabase vanity-subdomains get
Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase vanity-subdomains check-availability
Usage
supabase vanity-subdomains check-availability [flags]
Flags
--desired-subdomain <string>
Optional
The desired vanity subdomain to use for your Supabase project.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase vanity-subdomains delete
Deletes the vanity subdomain for a project, and reverts to using the project ref for routing.

Usage
supabase vanity-subdomains delete
Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase network-bans
Network bans are IPs that get temporarily blocked if their traffic pattern looks abusive (e.g. multiple failed auth attempts).

The subcommands help you view the current bans, and unblock IPs if desired.

Subcommands
supabase network-bans get
supabase network-bans remove
supabase network-bans get
Usage
supabase network-bans get
Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase network-bans remove
Usage
supabase network-bans remove [flags]
Flags
--db-unban-ip <strings>
Optional
IP to allow DB connections from.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase network-restrictions
Subcommands
supabase network-restrictions get
supabase network-restrictions update
supabase network-restrictions get
Usage
supabase network-restrictions get
Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase network-restrictions update
Usage
supabase network-restrictions update [flags]
Flags
--append
Optional
Append to existing restrictions instead of replacing them.

--bypass-cidr-checks
Optional
Bypass some of the CIDR validation checks.

--db-allow-cidr <strings>
Optional
CIDR to allow DB connections from.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase ssl-enforcement
Subcommands
supabase ssl-enforcement get
supabase ssl-enforcement update
supabase ssl-enforcement get
Usage
supabase ssl-enforcement get
Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase ssl-enforcement update
Usage
supabase ssl-enforcement update [flags]
Flags
--disable-db-ssl-enforcement
Optional
Whether the DB should disable SSL enforcement for all external connections.

--enable-db-ssl-enforcement
Optional
Whether the DB should enable SSL enforcement for all external connections.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase postgres-config
Subcommands
supabase postgres-config delete
supabase postgres-config get
supabase postgres-config update
supabase postgres-config get
Usage
supabase postgres-config get
Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase postgres-config update
Overriding the default Postgres config could result in unstable database behavior.
Custom configuration also overrides the optimizations generated based on the compute add-ons in use.

Usage
supabase postgres-config update [flags]
Flags
--config <strings>
Optional
Config overrides specified as a 'key=value' pair

--no-restart
Optional
Do not restart the database after updating config.

--replace-existing-overrides
Optional
If true, replaces all existing overrides with the ones provided. If false (default), merges existing overrides with the ones provided.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase postgres-config delete
Delete specific config overrides, reverting them to their default values.

Usage
supabase postgres-config delete [flags]
Flags
--config <strings>
Optional
Config keys to delete (comma-separated)

--no-restart
Optional
Do not restart the database after deleting config.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase snippets
Subcommands
supabase snippets download
supabase snippets list
supabase snippets list
List all SQL snippets of the linked project.

Usage
supabase snippets list
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase snippets download
Download contents of the specified SQL snippet.

Usage
supabase snippets download <snippet-id>
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase services
Usage
supabase services
supabase completion
Generate the autocompletion script for supabase for the specified shell.
See each sub-command's help for details on how to use the generated script.

Subcommands
supabase completion bash
supabase completion fish
supabase completion powershell
supabase completion zsh
supabase completion zsh
Generate the autocompletion script for the zsh shell.

If shell completion is not already enabled in your environment you will need
to enable it. You can execute the following once:

echo "autoload -U compinit; compinit" >> ~/.zshrc
To load completions in your current shell session:

source <(supabase completion zsh)
To load completions for every new session, execute once:

Linux:
supabase completion zsh > "${fpath[1]}/_supabase"
macOS:
supabase completion zsh > $(brew --prefix)/share/zsh/site-functions/_supabase
You will need to start a new shell for this setup to take effect.

Usage
supabase completion zsh [flags]
Flags
--no-descriptions
Optional
disable completion descriptions

supabase completion powershell
Generate the autocompletion script for powershell.

To load completions in your current shell session:

supabase completion powershell | Out-String | Invoke-Expression
To load completions for every new session, add the output of the above command
to your powershell profile.

Usage
supabase completion powershell [flags]
Flags
--no-descriptions
Optional
disable completion descriptions

supabase completion fish
Generate the autocompletion script for the fish shell.

To load completions in your current shell session:

supabase completion fish | source
To load completions for every new session, execute once:

supabase completion fish > ~/.config/fish/completions/supabase.fish
You will need to start a new shell for this setup to take effect.

Usage
supabase completion fish [flags]
Flags
--no-descriptions
Optional
disable completion descriptions

supabase completion bash
Generate the autocompletion script for the bash shell.

This script depends on the 'bash-completion' package.
If it is not installed already, you can install it via your OS's package manager.

To load completions in your current shell session:

source <(supabase completion bash)
To load completions for every new session, execute once:

Linux:
supabase completion bash > /etc/bash_completion.d/supabase
macOS:
supabase completion bash > $(brew --prefix)/etc/bash_completion.d/supabase
You will need to start a new shell for this setup to take effect.

Usage
supabase completion bash
Flags
--no-descriptions
Optional
disable completion descriptions