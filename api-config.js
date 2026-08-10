// Production requests stay on the storefront's origin. Vercel proxies /api/*
// to Render (see vercel.json), avoiding browser CORS failures during admin
// login. A local static server has no API proxy, so it calls Render directly.
window.RAYS_API_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "https://rays-enterprise-l7qp.onrender.com"
    : "";
