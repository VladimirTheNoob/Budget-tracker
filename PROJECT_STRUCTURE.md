# Project Structure

## Root Directory

- `.env`: Environment variables configuration file
- `package.json`, `package-lock.json`: NPM package configuration and lock files
- `node_modules/`: NPM dependencies (not committed to source control)
- `.cursorrules`: Custom instructions for the Cursor IDE
- `client/`: Frontend React application
- `server/`: Backend Express server
- `.vscode/`: Visual Studio Code configuration
- `start_client.ps1`, `start_server.ps1`: PowerShell scripts to start the client and server
- `debug_network.ps1`: PowerShell script for network debugging
- `.gitignore`, `.gitattributes`: Git configuration files
- `docker-compose.yml`, `Dockerfile`: Docker configuration for containerization
- `Project manifest.txt`, `Project manifest.docx`: Project documentation

## Client Directory

- `src/`: Main source code for the React frontend
  - `App.js`: Main React component that sets up routing, authentication, and imports other components
  - `components/`: Reusable React components
  - `config/`: Configuration files
  - `pages/`: Top-level page components 
  - `store/`: Redux store setup and slices
    - `authSlice.js`: Redux slice for managing authentication state
  - `api/`: API utility functions
  - `lib/`: Library/utility functions
  - `index.js`: React app entry point
- `public/`: Public static assets
- `package.json`, `package-lock.json`: Frontend NPM configuration
- `tailwind.config.js`, `postcss.config.js`: Tailwind CSS configuration

## Server Directory

- `index.js`: Main Express server entry point that sets up middleware, routes, authentication, etc.
- `storage/`: JSON file storage
- `utils/`: Utility modules
  - `googleAuth.js`: Google OAuth setup with Passport
  - `rbac.js`: Role-based access control functions
- `config/`: Server configuration 