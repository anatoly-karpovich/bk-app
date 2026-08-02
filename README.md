# BK App in Docker

Start the complete local stack from the repository root:

```powershell
docker compose up --build
```

The Docker-only backend configuration is declared directly in `docker-compose.yml`.

On the first start with a new MongoDB volume, the application creates a local
bootstrap administrator. The local defaults are:

```text
login: admin
password: local-admin-change-me
```

Override them before starting the stack when needed:

```powershell
$env:BOOTSTRAP_ADMIN_LOGIN = "admin"
$env:BOOTSTRAP_ADMIN_PASSWORD = "your-local-password"
$env:BOOTSTRAP_ADMIN_DISPLAY_NAME = "Local Administrator"
docker compose up --build
```

These credentials are intentionally for the checked-in local development stack
only. Do not use this compose file or its default credentials for a public or
production deployment; provide a unique administrator password through the
deployment environment instead.

Open the application at [http://localhost:3000](http://localhost:3000). The backend
is also available at `http://localhost:3004`, while MongoDB is exposed on port `27017`.

If those host ports are occupied, choose different ones for one invocation:

```powershell
$env:FRONTEND_PORT = "3001"
$env:BACKEND_PORT = "3005"
$env:MONGO_PORT = "27018"
docker compose up --build
```

On the first start with a new Docker volume, backend seeds `projects` and
`game_configs` from `backend/backups/db-data-projects`, then creates the bootstrap
administrator and assigns it access to every seeded project. Saved games are not seeded.

Stop containers without deleting data:

```powershell
docker compose down
```

To remove the local MongoDB volume and let the next startup seed a clean database:

```powershell
docker compose down -v
docker compose up --build
```
