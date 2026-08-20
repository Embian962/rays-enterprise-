// Production requests stay on the storefront's origin. Vercel proxies /api/*
// to Render (see vercel.json), avoiding browser CORS failures during admin
// login. A local static server has no API proxy, so it calls Render directly.
// Point the frontend to the deployed API on Render so the live site uses
// the correct backend regardless of hosting/proxy configuration.
// All devices use the same deployed API and database.
window.RAYS_API_URL = "https://rays-enterprise-l7qp.onrender.com";
