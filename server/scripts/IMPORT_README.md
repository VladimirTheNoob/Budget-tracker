# One-Time User Import Script

## Overview
This script provides a one-time import of users from JSON files to the PostgreSQL database.

### Prerequisites
- Ensure PostgreSQL database is running
- Configure `.env` file with database connection details
- Verify `employees.json` and `user-roles.json` exist in the `storage` directory

### Running the Import
```bash
# From the server directory
npm run import:users
```

### What the Script Does
1. Reads users from `storage/employees.json`
2. Reads user roles from `storage/user-roles.json`
3. Generates consistent user IDs
4. Inserts or updates users in the `users` table
5. Verifies imported users by displaying their details

### Features
- Uses a database transaction for data integrity
- Handles potential import errors
- Provides detailed logging
- Supports role assignment from `user-roles.json`

### Troubleshooting
- Check console output for detailed import logs
- Ensure database connection details are correct in `.env`
- Verify JSON file contents before import

### Notes
- Existing users will be updated if they already exist
- Default role is 'employee' if no role is specified
- User IDs are generated consistently using MD5 hash 