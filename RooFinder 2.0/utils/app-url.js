function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function getAppUrl() {
  return (
    normalizeUrl(process.env.APP_URL) ||
    normalizeUrl(process.env.RENDER_EXTERNAL_URL) ||
    'http://localhost:4000'
  );
}

module.exports = { getAppUrl, normalizeUrl };
