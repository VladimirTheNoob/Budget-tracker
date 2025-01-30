# Database Migration Guide

## Migrating from JSON to PostgreSQL

This project provides a migration script to transfer data from JSON files to PostgreSQL tables.

### Prerequisites

- Node.js installed
- PostgreSQL installed and running
- Database `budget_tracker` created

### Migration Steps

1. Ensure your `.env` file is configured with correct PostgreSQL credentials:
   ```
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=1111
   POSTGRES_DB=budget_tracker
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the migration script:
   ```bash
   npm run migrate
   ```

### What the Migration Does

- Transfers data from JSON files in `server/storage/` to corresponding PostgreSQL tables
- Clears existing data in tables before inserting
- Handles user roles, departments, employees, tasks, and goals

### Troubleshooting

- Ensure PostgreSQL is running
- Check that database and tables exist
- Verify connection credentials in `.env`

### Notes

- The migration is a one-time process
- Existing data in PostgreSQL tables will be replaced
- Backup your data before migration if needed 