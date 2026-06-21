const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const authHeader = req.headers['authorization'];

    const gatewayResponse = await fetch(
      'https://flow.ciandt.com/flow-llm-proxy/v1/models',
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    const data = await gatewayResponse.json();
    return res.status(gatewayResponse.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
