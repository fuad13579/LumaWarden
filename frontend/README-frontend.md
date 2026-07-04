# LumaWarden Frontend

## Run Locally

Install dependencies once:

```bash
npm install
```

Start the Vite dev server:

```bash
npm run dev
```

Use `http://localhost:5173` for local development. The backend CORS policy allows `localhost:5173` and `localhost:3000`; if you change the frontend port, make sure it remains one of those allowed origins.

## Backend URL

By default the frontend talks to `http://localhost:8000`.

To point it at another backend host or port, set `VITE_API_BASE_URL`:

```bash
VITE_API_BASE_URL=http://localhost:9000 npm run dev
```

On Windows PowerShell:

```powershell
$env:VITE_API_BASE_URL="http://localhost:9000"
npm run dev
```

## Read-Only Dashboard

This dashboard is read-only by backend design. There is no device-control API, so the lack of toggles or buttons is intentional rather than a missing feature.

The "kWh used today" value is a client-side estimate based on current watts and time since the app loaded. It is not historical backend data.
