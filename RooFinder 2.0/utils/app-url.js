function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function getAppUrl() {
  const vercelUrl = normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeUrl(process.env.VERCEL_URL);

  return (
    normalizeUrl(process.env.APP_URL) ||
    (vercelUrl ? `https://${vercelUrl}` : '') ||
    normalizeUrl(process.env.RENDER_EXTERNAL_URL) ||
    'http://localhost:4000'
  );
}

module.exports = { getAppUrl, normalizeUrl };
