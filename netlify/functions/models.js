export default async (request, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get('Authorization');

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

    return new Response(JSON.stringify(data), {
      status: gatewayResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
};

export const config = {
  path: '/api/models',
};
