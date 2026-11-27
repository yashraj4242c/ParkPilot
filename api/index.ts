import app from "../server/app.js";

// Vercel serverless function handler
// req.url is already the full path e.g. "/api/listings?q=delhi"
// Express app is mounted at root and handles /api/* routes itself
export default app;
