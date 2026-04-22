# Frontend (React)

This is a minimal Vite + React scaffold. To run locally:

```powershell
cd frontend
npm install
npm run dev
```

## Testing

Unit/component tests use **Vitest + React Testing Library**.

```powershell
cd frontend
npm install
npm test
```

The app includes a login page that posts to `http://localhost:4000/api/auth/login` and stores a JWT in `localStorage`. The legacy `login.html` now redirects to the SPA using `/?open=login` so the React login component is used.
