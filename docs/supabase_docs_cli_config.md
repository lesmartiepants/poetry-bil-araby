Local Dev / CLI
CLI
Configuration
Supabase CLI config

A supabase/config.toml file is generated after running supabase init.

You can edit this file to change the settings for your locally running project. After you make changes, you will need to restart using supabase stop and then supabase start for the changes to take effect.

General Config#
project_id#
Name	Default	Required
project_id	None	true
Description

A string used to distinguish different Supabase projects on the same host. Defaults to the working directory name when running supabase init.

Auth Config#
auth.enabled#
Name	Default	Required
auth.enabled	true	false
Description

Enable the local GoTrue service.

See also

Auth Server configuration
auth.site_url#
Name	Default	Required
auth.site_url	"http://localhost:3000"	false
Description

The base URL of your website. Used as an allow-list for redirects and for constructing URLs used in emails.

See also

Auth Server configuration
auth.additional_redirect_urls#
Name	Default	Required
auth.additional_redirect_urls	["https://localhost:3000"]	false
Description

A list of exact URLs that auth providers are permitted to redirect to post authentication.

See also

Auth Server configuration
auth.jwt_expiry#
Name	Default	Required
auth.jwt_expiry	3600	false
Description

How long tokens are valid for, in seconds. Defaults to 3600 (1 hour), maximum 604,800 seconds (one week).

See also

Auth Server configuration
auth.enable_manual_linking#
Name	Default	Required
auth.enable_manual_linking	false	false
Description

Allow testing manual linking of accounts

See also

Anonymous Sign Ins (Manual Linking)
auth.enable_refresh_token_rotation#
Name	Default	Required
auth.enable_refresh_token_rotation	true	false
Description

If disabled, the refresh token will never expire.

See also

Auth Server configuration
auth.refresh_token_reuse_interval#
Name	Default	Required
auth.refresh_token_reuse_interval	10	false
Description

Allows refresh tokens to be reused after expiry, up to the specified interval in seconds. Requires enable_refresh_token_rotation = true.

See also

Auth Server configuration
auth.rate_limit.email_sent#
Name	Default	Required
auth.rate_limit.email_sent	2	false
Description

Number of emails that can be sent per hour. Requires auth.email.smtp to be enabled.

See also

Auth Server configuration
auth.rate_limit.sms_sent#
Name	Default	Required
auth.rate_limit.sms_sent	30	false
Description

Number of SMS messages that can be sent per hour. Requires auth.sms to be enabled.

See also

Auth Server configuration
auth.rate_limit.anonymous_users#
Name	Default	Required
auth.rate_limit.anonymous_users	30	false
Description

Number of anonymous sign-ins that can be made per hour per IP address. Requires enable_anonymous_sign_ins = true.

See also

Auth Server configuration
auth.rate_limit.token_refresh#
Name	Default	Required
auth.rate_limit.token_refresh	150	false
Description

Number of sessions that can be refreshed in a 5 minute interval per IP address.

See also

Auth Server configuration
auth.rate_limit.sign_in_sign_ups#
Name	Default	Required
auth.rate_limit.sign_in_sign_ups	30	false
Description

Number of sign up and sign-in requests that can be made in a 5 minute interval per IP address (excludes anonymous users).

See also

Auth Server configuration
auth.rate_limit.token_verifications#
Name	Default	Required
auth.rate_limit.token_verifications	30	false
Description

Number of OTP / Magic link verifications that can be made in a 5 minute interval per IP address.

See also

Auth Server configuration
auth.enable_signup#
Name	Default	Required
auth.enable_signup	true	false
Description

Allow/disallow new user signups to your project.

See also

Auth Server configuration
auth.enable_anonymous_sign_ins#
Name	Default	Required
auth.enable_anonymous_sign_ins	false	false
Description

Allow/disallow anonymous sign-ins to your project.

See also

Anonymous Sign Ins
auth.email.enable_signup#
Name	Default	Required
auth.email.enable_signup	true	false
Description

Allow/disallow new user signups via email to your project.

See also

Auth Server configuration
auth.email.double_confirm_changes#
Name	Default	Required
auth.email.double_confirm_changes	true	false
Description

If enabled, a user will be required to confirm any email change on both the old, and new email addresses. If disabled, only the new email is required to confirm.

See also

Auth Server configuration
auth.email.enable_confirmations#
Name	Default	Required
auth.email.enable_confirmations	false	false
Description

If enabled, users need to confirm their email address before signing in.

See also

Auth Server configuration
auth.email.secure_password_change#
Name	Default	Required
auth.email.secure_password_change	None	false
Description

If enabled, requires the user's current password to be provided when changing to a new password.

See also

Auth Server configuration
auth.email.max_frequency#
Name	Default	Required
auth.email.max_frequency	1m	false
Description

The minimum amount of time that must pass between email requests.
Helps prevent email spam by limiting how frequently emails can be sent.
Example values: "1m", "1h", "24h"

See also

Auth Server configuration
auth.email.otp_length#
Name	Default	Required
auth.email.otp_length	6	false
Description

The length of the OTP code to be sent in emails.
Must be between 6 and 10 digits.

See also

Auth Server configuration
auth.email.otp_expiry#
Name	Default	Required
auth.email.otp_expiry	3600	false
Description

The expiry time for an OTP code in seconds.
Default is 3600 seconds (1 hour).

See also

Auth Server configuration
auth.email.smtp.host#
Name	Default	Required
auth.email.smtp.host	inbucket	false
Description

Hostname or IP address of the SMTP server.

auth.email.smtp.port#
Name	Default	Required
auth.email.smtp.port	2500	false
Description

Port number of the SMTP server.

auth.email.smtp.user#
Name	Default	Required
auth.email.smtp.user	None	false
Description

Username for authenticating with the SMTP server.

auth.email.smtp.pass#
Name	Default	Required
auth.email.smtp.pass	None	false
Description

Password for authenticating with the SMTP server.

auth.email.smtp.admin_email#
Name	Default	Required
auth.email.smtp.admin_email	admin@email.com	false
Description

Email used as the sender for emails sent from the application.

auth.email.smtp.sender_name#
Name	Default	Required
auth.email.smtp.sender_name	None	false
Description

Display name used as the sender for emails sent from the application.

auth.email.template.<type>.subject#
Name	Default	Required
auth.email.template.type.subject	None	false
Description

The full list of email template types are:

invite
confirmation
recovery
magic_link
email_change
See also

Auth Server configuration
auth.email.template.<type>.content_path#
Name	Default	Required
auth.email.template.type.content_path	None	false
Description

The full list of email template types are:

invite
confirmation
recovery
magic_link
email_change
See also

Auth Server configuration
auth.email.notification.<type>.enabled#
Name	Default	Required
auth.email.notification.type.enabled	None	false
Description

Determines whether or not to send email notifications for the given type.

The full list of email notification types are:

password_changed
email_changed
phone_changed
mfa_factor_enrolled
mfa_factor_unenrolled
identity_linked
identity_unlinked
See also

Auth Server configuration
auth.email.notification.<type>.subject#
Name	Default	Required
auth.email.notification.type.subject	None	false
Description

The subject for the given email notification type.

The full list of email notification types are:

password_changed
email_changed
phone_changed
mfa_factor_enrolled
mfa_factor_unenrolled
identity_linked
identity_unlinked
See also

Auth Server configuration
auth.email.notification.<type>.content_path#
Name	Default	Required
auth.email.notification.type.content_path	None	false
Description

The relative path to the content template for the given email notification type.

The full list of email notification types are:

password_changed
email_changed
phone_changed
mfa_factor_enrolled
mfa_factor_unenrolled
identity_linked
identity_unlinked
See also

Auth Server configuration
auth.sms.enable_signup#
Name	Default	Required
auth.sms.enable_signup	true	false
Description

Allow/disallow new user signups via SMS to your project.

See also

Auth Server configuration
auth.sms.enable_confirmations#
Name	Default	Required
auth.sms.enable_confirmations	false	false
Description

If enabled, users need to confirm their phone number before signing in.

See also

Auth Server configuration
auth.sms.test_otp#
Name	Default	Required
auth.sms.test_otp	None	false
Description

Use pre-defined map of phone number to OTP for testing.

Usage

1[auth.sms.test_otp]
24152127777 = "123456"

See also

Auth Server configuration
auth.sms.<provider>.enabled#
Name	Default	Required
auth.sms.provider.enabled	false	false
Description

Use an external SMS provider. The full list of providers are:

twilio
twilio_verify
messagebird
textlocal
vonage
See also

Auth Server configuration
auth.sms.<twilio|twilio_verify>.account_sid#
Name	Default	Required
auth.sms.twilio.account_sid	None	true
Description

Twilio Account SID

See also

Auth Server configuration
auth.sms.<twilio|twilio_verify>.message_service_sid#
Name	Default	Required
auth.sms.twilio.message_service_sid	None	true
Description

Twilio Message Service SID

See also

Auth Server configuration
auth.sms.<twilio|twilio_verify>.auth_token#
Name	Default	Required
auth.sms.twilio.auth_token	env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)	true
Description

Twilio Auth Token

DO NOT commit your Twilio auth token to git. Use environment variable substitution instead.

See also

Auth Server configuration
auth.sms.messagebird.originator#
Name	Default	Required
auth.sms.messagebird.originator	None	true
Description

MessageBird Originator

See also

Auth Server configuration
auth.sms.messagebird.access_key#
Name	Default	Required
auth.sms.messagebird.access_key	env(SUPABASE_AUTH_SMS_MESSAGEBIRD_ACCESS_KEY)	true
Description

MessageBird Access Key

DO NOT commit your MessageBird access key to git. Use environment variable substitution instead.

See also

Auth Server configuration
auth.sms.textlocal.sender#
Name	Default	Required
auth.sms.textlocal.sender	None	true
Description

TextLocal Sender

See also

Auth Server configuration
auth.sms.textlocal.api_key#
Name	Default	Required
auth.sms.textlocal.api_key	env(SUPABASE_AUTH_SMS_TEXTLOCAL_API_KEY)	true
Description

TextLocal API Key

DO NOT commit your TextLocal API key to git. Use environment variable substitution instead.

See also

Auth Server configuration
auth.sms.vonage.from#
Name	Default	Required
auth.sms.vonage.from	None	true
Description

Vonage From

See also

Auth Server configuration
auth.sms.vonage.api_key#
Name	Default	Required
auth.sms.vonage.api_key	None	true
Description

Vonage API Key

See also

Auth Server configuration
auth.sms.vonage.api_secret#
Name	Default	Required
auth.sms.vonage.api_secret	env(SUPABASE_AUTH_SMS_VONAGE_API_SECRET)	true
Description

Vonage API Secret

DO NOT commit your Vonage API secret to git. Use environment variable substitution instead.

See also

Auth Server configuration
auth.external.<provider>.enabled#
Name	Default	Required
auth.external.provider.enabled	false	false
Description

Use an external OAuth provider. The full list of providers are:

apple
azure
bitbucket
discord
facebook
github
gitlab
google
kakao
keycloak
linkedin_oidc
notion
twitch
twitter
slack_oidc
spotify
workos
zoom
See also

Auth Server configuration
auth.external.<provider>.client_id#
Name	Default	Required
auth.external.provider.client_id	None	true
Description

Client ID for the external OAuth provider.

See also

Auth Server configuration
auth.external.<provider>.secret#
Name	Default	Required
auth.external.provider.secret	env(SUPABASE_AUTH_EXTERNAL_<PROVIDER>_SECRET)	true
Description

Client secret for the external OAuth provider.

DO NOT commit your OAuth provider secret to git. Use environment variable substitution instead.

See also

Auth Server configuration
auth.external.<provider>.url#
Name	Default	Required
auth.external.provider.url	None	false
Description

The base URL used for constructing the URLs to request authorization and
access tokens. Used by gitlab and keycloak. For gitlab it defaults to
https://gitlab.com. For keycloak you need to set this to your instance,
for example: https://keycloak.example.com/realms/myrealm .

See also

Auth Server configuration
auth.external.<provider>.redirect_uri#
Name	Default	Required
auth.external.provider.redirect_uri	None	false
Description

The URI a OAuth2 provider will redirect to with the code and state values.

See also

Auth Server configuration
auth.external.<provider>.skip_nonce_check#
Name	Default	Required
auth.external.provider.skip_nonce_check	None	false
Description

Disables nonce validation during OIDC authentication flow for the specified provider. Enable only when client libraries cannot properly handle nonce verification. Be aware that this reduces security by allowing potential replay attacks with stolen ID tokens.

See also

Auth Server configuration
auth.hook.<hook_name>.enabled#
Name	Default	Required
auth.hook.<hook_name>.enabled	false	false
Description

Enable Auth Hook. Possible values for hook_name are: custom_access_token, send_sms, send_email, mfa_verification_attempt, and password_verification_attempt.

See also

Auth Hooks
auth.hook.<hook_name>.uri#
Name	Default	Required
auth.hook.<hook_name>.uri	None	false
Description

URI of hook to invoke. Should be a http or https function or Postgres function taking the form: pg-functions://<database>/<schema>/<function-name>. For example, pg-functions://postgres/auth/custom-access-token-hook.

See also

Auth Hooks
auth.hook.<hook_name>.secrets#
Name	Default	Required
auth.hook.<hook_name>.secrets	None	false
Description

Configure when using a HTTP Hooks. Takes a list of base64 comma separated values to allow for secret rotation. Currently, Supabase Auth uses only the first value in the list.

See also

Auth Hooks
auth.mfa.totp.enroll_enabled#
Name	Default	Required
auth.mfa.totp.enroll_enabled	true	false
Description

Enable TOTP enrollment for multi-factor authentication.

See also

Auth Multi-Factor Authentication (TOTP)
auth.mfa.totp.verify_enabled#
Name	Default	Required
auth.mfa.totp.verify_enabled	true	false
Description

Enable TOTP verification for multi-factor authentication.

See also

Auth Multi-Factor Authentication (TOTP)
auth.mfa.max_enrolled_factors#
Name	Default	Required
auth.mfa.max_enrolled_factors	10	false
Description

Control how many MFA factors can be enrolled at once per user.

See also

Auth Multi-Factor Authentication (TOTP)
auth.mfa.phone.enroll_enabled#
Name	Default	Required
auth.mfa.phone.enroll_enabled	false	false
Description

Enable Phone enrollment for multi-factor authentication.

See also

Auth Multi-Factor Authentication (Phone)
auth.mfa.phone.otp_length#
Name	Default	Required
auth.mfa.phone.otp_length	6	false
Description

Length of OTP code sent when using phone multi-factor authentication

See also

Auth Multi-Factor Authentication (Phone)
auth.mfa.phone.max_frequency#
Name	Default	Required
auth.mfa.phone.max_frequency	10s	false
Description

The minimum amount of time that must pass between phone requests.
Helps prevent spam by limiting how frequently messages can be sent.
Example values: "10s", "20s", "1m"

See also

Auth Multi-Factor Authentication (Phone)
auth.mfa.phone.otp_length#
Name	Default	Required
auth.mfa.phone.otp_length	6	false
Description

Length of OTP sent when using phone multi-factor authentication

See also

Auth Multi-Factor Authentication (Phone)
auth.mfa.phone.verify_enabled#
Name	Default	Required
auth.mfa.phone.verify_enabled	false	false
Description

Enable Phone verification for multi-factor authentication.

See also

Auth Multi-Factor Authentication (Phone)
auth.mfa.web_authn.enroll_enabled#
Name	Default	Required
auth.mfa.web_authn.enroll_enabled	false	false
Description

Enable WebAuthn enrollment for multi-factor authentication.

See also

Auth Multi-Factor Authentication
auth.mfa.web_authn.verify_enabled#
Name	Default	Required
auth.mfa.web_authn.verify_enabled	false	false
Description

Enable WebAuthn verification for multi-factor authentication.

See also

Auth Multi-Factor Authentication
auth.sessions.timebox#
Name	Default	Required
auth.sessions.timebox	None	false
Description

Force log out after the specified duration. Sample values include: '50m', '20h'.

See also

Auth Sessions
auth.sessions.inactivity_timeout#
Name	Default	Required
auth.sessions.inactivity_timeout	None	false
Description

Force log out if the user has been inactive longer than the specified duration. Sample values include: '50m', '20h'.

See also

Auth Sessions
auth.third_party.aws_cognito.enabled#
Name	Default	Required
auth.third_party.aws_cognito.enabled	false	false
Description

Enable third party auth with AWS Cognito (Amplify)

See also

Third Party Auth (Cognito)
auth.third_party.aws_cognito.user_pool_id#
Name	Default	Required
auth.third_party.aws_cognito.user_pool_id	false	false
Description

User Pool ID for AWS Cognito (Amplify) that you are integrating with

See also

Third Party Auth (Cognito)
auth.third_party.aws_cognito.user_pool_region#
Name	Default	Required
auth.third_party.aws_cognito.user_pool_region	false	false
Description

User Pool region for AWS Cognito (Amplify) that you are integrating with. Example values: 'ap-southeast-1', 'us-east-1'

See also

Third Party Auth (Cognito)
auth.third_party.auth0.enabled#
Name	Default	Required
auth.third_party.auth0.enabled	false	false
Description

Enable third party auth with Auth0

See also

Third Party Auth (Auth0)
auth.third_party.auth0.tenant#
Name	Default	Required
auth.third_party.auth0.tenant	false	false
Description

Tenant Identifier for Auth0 instance that you are integrating with

See also

Third Party Auth (Auth0)
auth.third_party.tenant_region#
Name	Default	Required
auth.third_party.auth0.tenant_region	false	false
Description

Tenant region for Auth0 instance that you are integrating with

See also

Third Party Auth (Auth0)
auth.third_party.firebase.enabled#
Name	Default	Required
auth.third_party.firebase.enabled	false	false
Description

Enable third party auth with Firebase

See also

Third Party Auth (Firebase)
auth.third_party.firebase.project_id#
Name	Default	Required
auth.third_party.firebase.project_id	false	false
Description

Project ID for Firebase instance that you are integrating with

See also

Third Party Auth (Firebase)
API Config#
api.enabled#
Name	Default	Required
api.enabled	true	false
Description

Enable the local PostgREST service.

See also

PostgREST configuration
api.port#
Name	Default	Required
api.port	54321	false
Description

Port to use for the API URL.

Usage

1[api]
2port = 54321

See also

PostgREST configuration
api.schemas#
Name	Default	Required
api.schemas	["public", "storage", "graphql_public"]	false
Description

Schemas to expose in your API. Tables, views and functions in this schema will get API endpoints. public and storage are always included.

See also

PostgREST configuration
api.extra_search_path#
Name	Default	Required
api.extra_search_path	["public", "extensions"]	false
Description

Extra schemas to add to the search_path of every request. public is always included.

See also

PostgREST configuration
api.max_rows#
Name	Default	Required
api.max_rows	1000	false
Description

The maximum number of rows returned from a view, table, or stored procedure. Limits payload size for accidental or malicious requests.

See also

PostgREST configuration
Database Config#
db.port#
Name	Default	Required
db.port	54322	false
Description

Port to use for the local database URL.

See also

PostgreSQL configuration
db.shadow_port#
Name	Default	Required
db.shadow_port	54320	false
Description

Port to use for the local shadow database.

See also

db.major_version#
Name	Default	Required
db.major_version	15	false
Description

The database major version to use. This has to be the same as your remote database's. Run SHOW server_version; on the remote database to check.

See also

PostgreSQL configuration
db.pooler.enabled#
Name	Default	Required
db.pooler.enabled	false	false
Description

Enable the local PgBouncer service.

See also

PgBouncer Configuration
db.pooler.port#
Name	Default	Required
db.pooler.port	54329	false
Description

Port to use for the local connection pooler.

See also

PgBouncer Configuration
db.pooler.pool_mode#
Name	Default	Required
db.pooler.pool_mode	"transaction"	false
Description

Specifies when a server connection can be reused by other clients. Configure one of the supported pooler modes: transaction, session.

See also

PgBouncer Configuration
db.pooler.default_pool_size#
Name	Default	Required
db.pooler.default_pool_size	20	false
Description

How many server connections to allow per user/database pair.

See also

PgBouncer Configuration
db.settings.effective_cache_size#
Name	Default	Required
db.settings.effective_cache_size	None	false
Description

Sets the planner's assumption about the effective size of the disk cache.
This is a query planner parameter that doesn't affect actual memory allocation.

See also

PostgreSQL configuration
db.settings.logical_decoding_work_mem#
Name	Default	Required
db.settings.logical_decoding_work_mem	None	false
Description

Specifies the amount of memory to be used by logical decoding, before writing data to local disk.

See also

PostgreSQL configuration
db.settings.maintenance_work_mem#
Name	Default	Required
db.settings.maintenance_work_mem	None	false
Description

Specifies the maximum amount of memory to be used by maintenance operations, such as VACUUM, CREATE INDEX, and ALTER TABLE ADD FOREIGN KEY.

See also

PostgreSQL configuration
db.settings.max_connections#
Name	Default	Required
db.settings.max_connections	None	false
Description

Determines the maximum number of concurrent connections to the database server.
Note: Changing this parameter requires a database restart.

See also

PostgreSQL configuration
db.settings.max_locks_per_transaction#
Name	Default	Required
db.settings.max_locks_per_transaction	None	false
Description

Controls the average number of object locks allocated for each transaction.
Note: Changing this parameter requires a database restart.

See also

PostgreSQL configuration
db.settings.max_parallel_maintenance_workers#
Name	Default	Required
db.settings.max_parallel_maintenance_workers	None	false
Description

Sets the maximum number of parallel workers that can be started by a single utility command.

See also

PostgreSQL configuration
db.settings.max_parallel_workers#
Name	Default	Required
db.settings.max_parallel_workers	None	false
Description

Sets the maximum number of parallel workers that the system can support.
Note: Changing this parameter requires a database restart.

See also

PostgreSQL configuration
db.settings.max_parallel_workers_per_gather#
Name	Default	Required
db.settings.max_parallel_workers_per_gather	None	false
Description

Sets the maximum number of parallel workers that can be started by a single Gather or Gather Merge node.

See also

PostgreSQL configuration
db.settings.max_replication_slots#
Name	Default	Required
db.settings.max_replication_slots	None	false
Description

Specifies the maximum number of replication slots that the server can support.
Note: Changing this parameter requires a database restart.

See also

PostgreSQL configuration
db.settings.max_slot_wal_keep_size#
Name	Default	Required
db.settings.max_slot_wal_keep_size	None	false
Description

Specifies the maximum size of WAL files that replication slots are allowed to retain in the pg_wal directory.

See also

PostgreSQL configuration
db.settings.max_standby_archive_delay#
Name	Default	Required
db.settings.max_standby_archive_delay	None	false
Description

Sets the maximum delay before canceling queries when a hot standby server is processing archived WAL data.

See also

PostgreSQL configuration
db.settings.max_standby_streaming_delay#
Name	Default	Required
db.settings.max_standby_streaming_delay	None	false
Description

Sets the maximum delay before canceling queries when a hot standby server is processing streamed WAL data.

See also

PostgreSQL configuration
db.settings.max_wal_size#
Name	Default	Required
db.settings.max_wal_size	None	false
Description

Sets the maximum size of WAL files that the system will keep in the pg_wal directory.

See also

PostgreSQL configuration
db.settings.max_wal_senders#
Name	Default	Required
db.settings.max_wal_senders	None	false
Description

Specifies the maximum number of concurrent connections from standby servers or streaming base backup clients.
Note: Changing this parameter requires a database restart.

See also

PostgreSQL configuration
db.settings.max_worker_processes#
Name	Default	Required
db.settings.max_worker_processes	None	false
Description

Sets the maximum number of background processes that the system can support.
Note: Changing this parameter requires a database restart.

See also

PostgreSQL configuration
db.settings.session_replication_role#
Name	Default	Required
db.settings.session_replication_role	None	false
Description

Controls whether triggers and rewrite rules are enabled. Valid values are: "origin", "replica", or "local".

See also

PostgreSQL configuration
db.settings.shared_buffers#
Name	Default	Required
db.settings.shared_buffers	None	false
Description

Sets the amount of memory the database server uses for shared memory buffers.
Note: Changing this parameter requires a database restart.

See also

PostgreSQL configuration
db.settings.statement_timeout#
Name	Default	Required
db.settings.statement_timeout	None	false
Description

Abort any statement that takes more than the specified amount of time.

See also

PostgreSQL configuration
db.settings.track_activity_query_size#
Name	Default	Required
db.settings.track_activity_query_size	None	false
Description

Sets the maximum size of the query string that will be tracked in pg_stat_activity.current_query field.
Note: Changing this parameter requires a database restart.

See also

PostgreSQL configuration
db.settings.track_commit_timestamp#
Name	Default	Required
db.settings.track_commit_timestamp	None	false
Description

Record commit time of transactions.
Note: Changing this parameter requires a database restart.

See also

PostgreSQL configuration
db.settings.wal_keep_size#
Name	Default	Required
db.settings.wal_keep_size	None	false
Description

Specifies the minimum size of past log file segments kept in the pg_wal directory.

See also

PostgreSQL configuration
db.settings.wal_sender_timeout#
Name	Default	Required
db.settings.wal_sender_timeout	None	false
Description

Terminate replication connections that are inactive for longer than this amount of time.

See also

PostgreSQL configuration
db.settings.work_mem#
Name	Default	Required
db.settings.work_mem	None	false
Description

Specifies the amount of memory to be used by internal sort operations and hash tables before writing to temporary disk files.

See also

PostgreSQL configuration
db.pooler.max_client_conn#
Name	Default	Required
db.pooler.max_client_conn	100	false
Description

Maximum number of client connections allowed.

See also

PgBouncer Configuration
db.seed.enabled#
Name	Default	Required
db.seed.enabled	true	false
Description

Enables running seeds when starting or resetting the database.

See also

db.seed.sql_paths#
Name	Default	Required
db.seed.sql_paths	["./seed.sql"]	false
Description

An array of files or glob patterns to find seeds in.

See also

Seeding your database
Dashboard Config#
studio.enabled#
Name	Default	Required
studio.enabled	true	false
Description

Enable the local Supabase Studio dashboard.

See also

studio.port#
Name	Default	Required
studio.port	54323	false
Description

Port to use for Supabase Studio.

See also

studio.api_url#
Name	Default	Required
studio.api_url	"http://localhost"	false
Description

External URL of the API server that frontend connects to.

See also

studio.openai_api_key#
Name	Default	Required
studio.openai_api_key	env(OPENAI_API_KEY)	false
Description

OpenAI API key used for AI features in the Studio dashboard.
DO NOT commit your OpenAI API key to git. Use environment variable substitution instead.

See also

OpenAI API Keys
Realtime Config#
realtime.enabled#
Name	Default	Required
realtime.enabled	true	false
Description

Enable the local Realtime service.

See also

realtime.ip_version#
Name	Default	Required
realtime.ip_version	"IPv6"	false
Description

Bind realtime via either IPv4 or IPv6. (default: IPv6)

See also

Storage Config#
storage.enabled#
Name	Default	Required
storage.enabled	true	false
Description

Enable the local Storage service.

See also

Storage server configuration
storage.file_size_limit#
Name	Default	Required
storage.file_size_limit	"50MiB"	false
Description

The maximum file size allowed for all buckets in the project.

See also

Storage server configuration
storage.buckets.<bucket_name>.public#
Name	Default	Required
storage.buckets.bucket_name.public	false	false
Description

Enable public access to the bucket.

See also

Storage server configuration
storage.buckets.<bucket_name>.file_size_limit#
Name	Default	Required
storage.buckets.bucket_name.file_size_limit	None	false
Description

The maximum file size allowed (e.g. "5MB", "500KB").

See also

Storage server configuration
storage.buckets.<bucket_name>.allowed_mime_types#
Name	Default	Required
storage.buckets.bucket_name.allowed_mime_types	None	false
Description

The list of allowed MIME types for objects in the bucket.

See also

Storage server configuration
storage.buckets.<bucket_name>.objects_path#
Name	Default	Required
storage.buckets.bucket_name.objects_path	None	false
Description

The local directory to upload objects to the bucket.

See also

Storage server configuration
Edge-Functions Config#
edge_runtime.enabled#
Name	Default	Required
edge_runtime.enabled	true	false
Description

Enable the local Edge Runtime service for Edge Functions.

See also

edge_runtime.policy#
Name	Default	Required
edge_runtime.policy	"oneshot"	false
Description

Configure the request handling policy for Edge Functions. Available options:

oneshot: Recommended for development with hot reload support
per_worker: Recommended for load testing scenarios
See also

edge_runtime.inspector_port#
Name	Default	Required
edge_runtime.inspector_port	8083	false
Description

Port to attach the Chrome inspector for debugging Edge Functions.

See also

functions.<function_name>.enabled#
Name	Default	Required
functions.function_name.enabled	true	false
Description

Controls whether a function is deployed or served. When set to false,
the function will be skipped during deployment and won't be served locally.
This is useful for disabling demo functions or temporarily disabling a function
without removing its code.

See also

`supabase functions` CLI subcommands
functions.<function_name>.verify_jwt#
Name	Default	Required
functions.function_name.verify_jwt	true	false
Description

By default, when you deploy your Edge Functions or serve them locally, it
will reject requests without a valid JWT in the Authorization header.
Setting this configuration changes the default behavior.

Note that the --no-verify-jwt flag overrides this configuration.

See also

`supabase functions` CLI subcommands
functions.<function_name>.import_map#
Name	Default	Required
functions.function_name.import_map	None	false
Description

Specify the Deno import map file to use for the Function.
When not specified, defaults to supabase/functions/<function_name>/deno.json.

Note that the --import-map flag overrides this configuration.

See also

`supabase functions` CLI subcommands
functions.<function_name>.entrypoint#
Name	Default	Required
functions.function_name.entrypoint	None	false
Description

Specify a custom entrypoint path for the function relative to the project root.
When not specified, defaults to supabase/functions/<function_name>/index.ts.

Usage

1[functions.my_function]
2entrypoint = "path/to/custom/function.ts"

See also

`supabase functions` CLI subcommands
functions.<function_name>.static_files#
Name	Default	Required
functions.function_name.static_files	None	false
Description

Specify an array of static files to be bundled with the function. Supports glob patterns.

NOTE: only file paths within functions directory are supported at the moment.

Usage

1[functions.my_function]
2static_files = [ "./functions/MY_FUNCTION_NAME/*.html", "./functions/MY_FUNCTION_NAME/custom.wasm" ]

See also

`supabase functions` CLI subcommands
Analytics Config#
analytics.enabled#
Name	Default	Required
analytics.enabled	false	false
Description

Enable the local Logflare service.

See also

Self-hosted Logflare Configuration
analytics.port#
Name	Default	Required
analytics.port	54327	false
Description

Port to the local Logflare service.

See also

analytics.vector_port#
Name	Default	Required
analytics.vector_port	54328	false
Description

Port to the local syslog ingest service.

See also

analytics.backend#
Name	Default	Required
analytics.backend	"postgres"	false
Description

Configure one of the supported backends:

postgres
bigquery
See also

Self-hosted Logflare Configuration
Experimental Config#
experimental.webhooks.enabled#
Name	Default	Required
experimental.webhooks.enabled	false	false
Description

Automatically enable webhook features on each new created branch
Note: This is an experimental feature and may change in future releases.

See also

experimental.orioledb_version#
Name	Default	Required
experimental.orioledb_version	None	false
Description

Configures Postgres storage engine to use OrioleDB with S3 support.
Note: This is an experimental feature and may change in future releases.

See also

experimental.s3_host#
Name	Default	Required
experimental.s3_host	env(S3_HOST)	false
Description

Configures S3 bucket URL for OrioleDB storage.
Format example: <bucket_name>.s3-<region>.amazonaws.com
Note: This is an experimental feature and may change in future releases.

See also

experimental.s3_region#
Name	Default	Required
experimental.s3_region	env(S3_REGION)	false
Description

Configures S3 bucket region for OrioleDB storage.
Example: us-east-1
Note: This is an experimental feature and may change in future releases.

See also

experimental.s3_access_key#
Name	Default	Required
experimental.s3_access_key	env(S3_ACCESS_KEY)	false
Description

Configures AWS_ACCESS_KEY_ID for S3 bucket access.
DO NOT commit your AWS access key to git. Use environment variable substitution instead.
Note: This is an experimental feature and may change in future releases.

See also

experimental.s3_secret_key#
Name	Default	Required
experimental.s3_secret_key	env(S3_SECRET_KEY)	false
Description

Configures AWS_SECRET_ACCESS_KEY for S3 bucket access.
DO NOT commit your AWS secret key to git. Use environment variable substitution instead.
Note: This is an experimental feature and may change in future releases.

See also

Local Development Config#
inbucket.enabled#
Name	Default	Required
inbucket.enabled	true	false
Description

Enable the local InBucket service.

See also

Inbucket documentation
inbucket.port#
Name	Default	Required
inbucket.port	54324	false
Description

Port to use for the email testing server web interface.

Emails sent with the local dev setup are not actually sent - rather, they are monitored, and you can view the emails that would have been sent from the web interface.

See also

Inbucket documentation
inbucket.smtp_port#
Name	Default	Required
inbucket.smtp_port	54325	false
Description

Port to use for the email testing server SMTP port.

Emails sent with the local dev setup are not actually sent - rather, they are monitored, and you can view the emails that would have been sent from the web interface.

If set, you can access the SMTP server from this port.

See also

Inbucket documentation
inbucket.pop3_port#
Name	Default	Required
inbucket.pop3_port	54326	false
Description

Port to use for the email testing server POP3 port.

Emails sent with the local dev setup are not actually sent - rather, they are monitored, and you can view the emails that would have been sent from the web interface.

If set, you can access the POP3 server from this port.

See also

Inbucket documentation
inbucket.admin_email#
Name	Default	Required
inbucket.admin_email	admin@email.com	false
Description

Email used as the sender for emails sent from the application.

inbucket.sender_name#
Name	Default	Required
inbucket.sender_name	Admin	false
Description

Display name used as the sender for emails sent from the application.

Branching Config#
remotes.<branch_name>.project_id#
Name	Default	Required
remotes.branch_name.project_id	None	true
Description

The project reference ID for a specific persistent Supabase branch.
This ID is used to configure branch-specific settings in your config.toml file for branches deployments.
All other configuration options available in the root config are also supported in the remotes block.
For example, you can specify branch-specific database settings like so:

Usage
[remotes.<branch_name>]
2project_id = "your-project-ref"
3
4[remotes.<branch_name>.db.seed]
5sql_paths = ["./seeds/staging.sql"]
