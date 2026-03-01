# Claud_Storage

## Project structure

- `backend/` Express API (deploy to Render)
- `dashboard-react/` React + Vite frontend (deploy to Vercel)

## Deploy checklist

1. Deploy `backend/` on Render.
2. Backend URL: `https://claud-storage.onrender.com`.
3. In Vercel (frontend project), set env var:
   - `VITE_API_BASE_URL=https://claud-storage.onrender.com`
4. Redeploy frontend.
