# Dashboard React (Frontend)

## Local development

1. Install dependencies:
   - `npm install`
2. Create env file:
   - copy `.env.example` to `.env`
3. Set backend URL:
   - `VITE_API_BASE_URL=https://claud-storage.onrender.com`
4. Start app:
   - `npm run dev`

## Deployment (Vercel + Render)

1. Deploy backend folder `backend/` to Render.
2. Copy your Render backend URL, for example:
   - `https://claud-storage.onrender.com`
3. In Vercel project settings for this frontend, add env var:
   - `VITE_API_BASE_URL=https://claud-storage.onrender.com`
4. Redeploy Vercel frontend.

## Notes

- Frontend auth and file APIs use `VITE_API_BASE_URL`.
- If this env var is missing, frontend falls back to `https://claud-storage.onrender.com`.
