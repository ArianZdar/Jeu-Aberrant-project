## Jeu Aberrant — Quick dev README

<p align="center">
  <img src="./Screenshot 2025-10-15 143028.png" width="250" alt="Home Screen">
</p>


This short README explains the big picture of the repository and gives concise, tested steps to run the project locally (server + client) on Windows / PowerShell.

### Big picture

- The repository is a starter codebase for a multiplayer game project used in the LOG2990 course.
- Two main apps live in this workspace:
  - `server/` — a NestJS server (TypeScript, uses Socket.IO and Mongoose for optional MongoDB integration). Exposes an OpenAPI (Swagger) UI at `/api/docs` when running.
  - `client/` — an Angular (v19) single-page app served by the Angular dev server (port 4200 by default).
- Shared game logic lives in top-level folders like `common/`, `game/`, `grid/`, `player/` and are imported by the client and/or server.

### Repository layout (high level)

- `client/` — Angular app, run with `npm start` (ng serve). Port 4200.
- `server/` — NestJS app, run with `npm start`. Listens on the `PORT` environment variable.
- `common/`, `game/`, `grid/`, `player/`, `lobby/` — shared TypeScript modules with game rules, entities, helpers.
- `.vscode/launch.json` — VS Code debug configurations (server attach, open Chrome on client, etc.).

### Prerequisites

- Node.js (LTS). Recommended: Node 18.x or Node 20.x. The code uses TypeScript 5.5 and modern packages.
- npm (comes with Node). This repository uses `package-lock.json` (npm) in `client/` and `server/`.
- Optional: MongoDB if you want persistent storage (server can run without it — see notes below).
- Optional: Angular CLI globally if you want to use `ng` commands directly. Not required for `npm start`.

### Quick start (PowerShell)

1) Open a PowerShell terminal in the repository root.

2) Install dependencies for both projects. Run these in separate commands (or open two terminals):

```powershell
cd .\server
npm ci

cd ..\client
npm ci
```

Notes:
- `npm ci` installs exact versions from `package-lock.json` (recommended). Use `npm install` if you need to add packages.

3) Start the server

- The server reads the port from the environment variable `PORT`. It also supports a MongoDB connection string via `DATABASE_CONNECTION_STRING` (if your code uses the DB features). Example (PowerShell):

```powershell
cd .\server
$env:PORT = '5000'
$env:DATABASE_CONNECTION_STRING = 'mongodb://localhost:27017/jeuaberrant'  # optional
npm start
```

- If you don't need MongoDB, you can leave `DATABASE_CONNECTION_STRING` unset. If the server code expects mongoose config, follow the note in `server/README.md` to comment out the example MongooseModule configuration.

4) Start the client (in a second terminal)

```powershell
cd .\client
npm start
```

This will start Angular's dev server and (by default) open your browser at `http://localhost:4200`.

5) Useful URLs

- Client (Angular dev server): http://localhost:4200
- Server Swagger / API docs (when `PORT` is set and server running): http://localhost:5000/api/docs  (replace port if you chose a different one)

### Tests and builds

- Run server unit tests:

```powershell
cd .\server
npm test
```

- Run client tests:

```powershell
cd .\client
npm test
```

- Build client for production:

```powershell
cd .\client
npm run build
```

- Build server (Nest compile):

```powershell
cd .\server
npm run build
```

### Debugging in VS Code

- The `.vscode/launch.json` file already has helpful configurations:
  - `Debug server (Attach)` — attach to Node on port 9229.
  - `Launch Client With Debug` — open Chrome on `http://localhost:4200` for client debugging.

- To use the server attach configuration, start the server (npm start) and then run the `Debug server (Attach)` configuration in the Run view.

### Notes & troubleshooting

- If Angular fails to serve, check that Node and npm versions match the required range and that `node_modules` was installed without errors.
- If Nest fails to start because of database config, either set `DATABASE_CONNECTION_STRING` to a valid MongoDB URL or follow the `server/README.md` instructions for disabling the example Mongoose config.
- If ports 4200 or 5000 are in use, pick other port values and adjust the `PORT` variable for the server and pass `--port` to `ng serve` (or change `package.json` script temporarily).

### Where to look next

- `server/README.md` — more details on NestJS server choices and the MongoDB/SocketIO examples (French).
- `client/` — Angular source under `client/src/app`.
- `common/`, `game/`, `player/`, `grid/` — game logic you can study and modify.

If you'd like, I can:

- add a small `.env.example` in `server/` with recommended variables,
- add a single terminal `README` script to launch both apps using `concurrently` or a VS Code compound launch configuration,
- or produce a short troubleshooting checklist tailored to errors you see when running these commands.

---
