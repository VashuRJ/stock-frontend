# frontend-react

React + Vite + TypeScript frontend for your FastAPI backend.

## Prerequisites
- Node.js 18+
- Backend running at `http://localhost:8000`

## Setup
```powershell
cd "C:\Users\mogha\OneDrive\Desktop\AI  Ml\frontend-react"
npm install
Copy-Item .env.example .env
```
Update `.env` if your backend URL differs.

## Run (dev)
```powershell
npm run dev
```
Dev server runs at `http://localhost:5173`. Requests to `/api/*` are proxied to your backend.

## Build
```powershell
npm run build
npm run preview
```

## Structure
- `src/components/Navbar.tsx` TradingView-style header
- `src/pages/*` Home, Login, Dashboard
- `src/api/client.ts` axios with token interceptor
