# Database migrations

These migrations extend the existing ChocoFixCo MariaDB schema.

For a fresh installation, initialise the original application
database before applying these SQL files in numerical order:

1. 001_user_accounts.sql
2. 004_account_lifecycle.sql
3. 005_customer_profiles.sql

Migrations 002 and 003 were superseded during local development.
The final email-and-role authentication schema is included in 001.

The existing development database already contains these changes.
Do not reset or reseed an existing database.

Create the initial administrator privately using
api/scripts/createAdmin.js.

Environment files, passwords, OAuth secrets and database backups
must not be committed to GitHub.
