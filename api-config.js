// Production requests stay on the storefront's origin. Vercel proxies /api/*
// to Render (see vercel.json), avoiding browser CORS failures during admin
// login. A local static server has no API proxy, so it calls Render directly.
// Point the frontend to the deployed API on Render so the live site uses
// the correct backend regardless of hosting/proxy configuration.
// All devices use the same deployed API and database.
window.RAYS_API_URL = (window.location.protocol === "https:" && !/localhost|127\\./.test(window.location.hostname)) ? "" : "https://rays-enterprise-l7qp.onrender.com";

window.RAYS_SUPABASE_URL = "https://tayhupalvkpxdnldyngl.supabase.co";
window.RAYS_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheWh1cGFsdmtweGRubGR5bmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjgwMzAsImV4cCI6MjEwMTU0NDAzMH0.Jh2fFqku86_5WVbw0YB4u4nxoNcKolGD19nsME-D9CA";

