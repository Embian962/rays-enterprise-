# Ray's Enterprise deployment

The frontend remains the existing HTML/CSS/JavaScript catalog. The new `api/` folder is an Express API and `database/schema.sql` creates the PostgreSQL database tables.

## Online deployment: Supabase + Render + Vercel

1. Push this project to a **private GitHub repository**. Do not commit `.env`.
2. In **Supabase**, create a project, then open its SQL Editor and run `database/schema.sql`. Copy the connection string from the Supabase Connect panel.
3. In **Render**, create a new Blueprint from this repository. It will read `render.yaml`. Set `DATABASE_URL` to the Supabase connection string, `FRONTEND_ORIGIN` to the Vercel URL, and choose strong values for `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Copy the Render service URL. The Render root URL is the API status page; use `/health` to verify the database connection.
4. In **Vercel**, import the same repository as a static site. No build command is required. Copy its production URL.
5. In Render, set `FRONTEND_ORIGIN` to the Vercel URL, then redeploy the API.
6. In `api-config.js`, set `window.RAYS_API_URL` to the Render API URL and redeploy the Vercel site.

The storefront must be opened through the Vercel URL, not the Render URL. Sign in on `admin.html` using the Render `ADMIN_USERNAME` and `ADMIN_PASSWORD` values before changing products. Product changes are then stored in Supabase and appear in customer catalogs after they reload.

Before deploying, replace the current `localStorage` frontend calls with requests to the `/api` endpoints. Admin authentication should be connected to a real sign-in system before public launch; never put `ADMIN_API_KEY` in public browser JavaScript.
