# LumaWarden Frontend

React + Vite dashboard for the LumaWarden office monitoring system.

The frontend does not generate device data. It reads the shared backend snapshot through REST and receives live updates through WebSocket.

## Backend Dependency

Start the backend from the repository root before running the dashboard:

```bash
uvicorn backend.main:app --reload
```

Expected backend URLs:

- REST API: `http://localhost:8000`
- WebSocket: `ws://localhost:8000/ws`
- Swagger docs: `http://localhost:8000/docs`

## Setup

Install frontend dependencies:

```bash
npm install
```

## Run

Start the Vite dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The backend CORS policy already allows `localhost:5173`.

## Backend URL Override

By default, the frontend uses:

```text
http://localhost:8000
```

To point the dashboard at a different backend:

```bash
VITE_API_BASE_URL=http://localhost:9000 npm run dev
```

Windows PowerShell:

```powershell
$env:VITE_API_BASE_URL="http://localhost:9000"
npm run dev
```

## Data Flow

- Initial and fallback reads use `GET /api/snapshot`.
- Live updates use `WebSocket /ws`.
- Device panels, power meters, office layout, and alerts all render from backend snapshots.
- If WebSocket disconnects, the dashboard falls back to polling and retries the WebSocket connection.

## Validation

```bash
npm run build
```
