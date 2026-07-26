# BK App in Docker

Start the complete local stack from the repository root:

```powershell
docker compose up --build
```

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
`game_configs` from `backend/backups/db-data-projects`. Saved games are not seeded.

Stop containers without deleting data:

```powershell
docker compose down
```

To remove the local MongoDB volume and let the next startup seed a clean database:

```powershell
docker compose down -v
docker compose up --build
```
