# Ray's Enterprise deployment

The frontend remains the existing HTML/CSS/JavaScript catalog. The new `api/` folder is an Express API and `database/schema.sql` creates the PostgreSQL database tables.

## Online deployment: Supabase + Render + Vercel

1. Push this project to a **private GitHub repository**. Do not commit `.env`.
2. In **Supabase**, create a project, then open its SQL Editor and run `database/schema.sql`. Copy the connection string from the Supabase Connect panel. In **Storage**, create a public bucket named `product-images` for storefront photos.
3. In **Render**, create a new Blueprint from this repository. It will read `render.yaml`. Set `DATABASE_URL` to the Supabase connection string, `FRONTEND_ORIGIN` to the Vercel URL, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, then choose strong values for `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Keep the service role key only in Render; never add it to `api-config.js` or other browser code. Copy the Render service URL. The Render root URL is the API status page; use `/health` to verify the database connection.
4. In **Vercel**, import the same repository as a static site. No build command is required. Copy its production URL.
5. In Render, set `FRONTEND_ORIGIN` to the Vercel URL, then redeploy the API.
6. In `api-config.js`, set `window.RAYS_API_URL` to the Render API URL and redeploy the Vercel site.

The storefront must be opened through the Vercel URL, not the Render URL. Sign in on `admin.html` using the Render `ADMIN_USERNAME` and `ADMIN_PASSWORD` values before changing products. Product changes are then stored in Supabase and appear in customer catalogs after they reload.

After the API and storefront changes are deployed, sign in to `admin.html`, open **Products**, and choose **Move existing photos to Storage**. Confirm the migration and leave the page open until the status says no products remain. It processes every image in each product gallery, resizes them to at most 1400 pixels, converts them to WebP, and stores public image URLs in the database. Current photos remain visible while records are being moved; the catalog response gets smaller as the migration progresses. New admin uploads use the same resizing and storage flow.

Before deploying, replace the current `localStorage` frontend calls with requests to the `/api` endpoints. Admin authentication should be connected to a real sign-in system before public launch; never put `ADMIN_API_KEY` in public browser JavaScript.
