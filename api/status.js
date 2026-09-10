module.exports = function handler(_request, response) {
  response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  response.status(200).json({
    product: 'CalendarFuse',
    status: 'operational',
    mode: 'private-beta-demo',
    providerConnections: 'configuration-required',
    updatedAt: '2026-09-10T00:00:00.000Z'
  });
};
