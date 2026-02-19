Database
Examples
Replicating from Supabase to External Postgres
Replicate to another Postgres database using Logical Replication

For this example, you will need:

A Supabase project
A Postgres database (running v10 or newer)
You will be running commands on both of these databases to publish changes from the Supabase database to the external database.

Create a publication on the Supabase database:
CREATE PUBLICATION example_pub;
Also on the Supabase database, create a replication slot:
select pg_create_logical_replication_slot('example_slot', 'pgoutput');
Now connect to your external database and subscribe to the publication
This needs a direct connection (not a Connection Pooler) to your database and you can find the connection info in the Connect panel in the Direct connection section.

You will also need to ensure that IPv6 is supported by your replication destination (or you can enable the IPv4 add-on)

If you would prefer not to use the postgres user, then you can run CREATE ROLE <user> WITH REPLICATION; using the postgres user.

CREATE SUBSCRIPTION example_sub
CONNECTION 'host=db.oaguxblfdassqxvvwtfe.supabase.co user=postgres password=YOUR_PASS dbname=postgres'
PUBLICATION example_pub
WITH (copy_data = true, create_slot=false, slot_name=example_slot);
For projects running Postgres 17+, it is possible to subscribe to a Read
Replica by using your Read Replica's connection string.

create_slot is set to false because slot_name is provided and the slot was already created in Step 2.
To copy data from before the slot was created, set copy_data to true.

Now we'll go back to the Supabase DB and add all the tables that you want replicated to the publication.
ALTER PUBLICATION example_pub ADD TABLE example_table;
Check the replication status using pg_stat_replication
select * from pg_stat_replication;
You can add more tables to the initial publication, but you're going to need to do a REFRESH on the subscribing database.
See https://www.postgresql.org/docs/current/sql-alterpublication.html

