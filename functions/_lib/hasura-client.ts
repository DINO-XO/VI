const HASURA_GRAPHQL_URL =
  process.env.NHOST_GRAPHQL_URL ||
  process.env.HASURA_GRAPHQL_ENDPOINT ||
  'https://vfpldelxmutaipflovkl.hasura.ap-south-1.nhost.run/v1/graphql';

const HASURA_ADMIN_SECRET =
  process.env.NHOST_ADMIN_SECRET ||
  process.env.HASURA_GRAPHQL_ADMIN_SECRET ||
  '';

export async function hasuraAdminQuery<T = any>(
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (HASURA_ADMIN_SECRET) {
    headers['x-hasura-admin-secret'] = HASURA_ADMIN_SECRET;
  }

  let res = await fetch(HASURA_GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  let body = (await res.json()) as { data?: T; errors?: any[] };

  // If secret failed or missing header required, retry with default nhost secret if set
  if (body.errors && body.errors.some((e: any) => e.message?.includes('x-hasura-admin-secret'))) {
    res = await fetch(HASURA_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': 'nhost-admin-secret',
      },
      body: JSON.stringify({ query, variables }),
    });
    body = (await res.json()) as { data?: T; errors?: any[] };
  }

  if (body.errors && body.errors.length > 0) {
    console.error('[Hasura Admin Query Error]:', JSON.stringify(body.errors));
    throw new Error(body.errors[0]?.message || 'Hasura GraphQL Error');
  }

  if (!body.data) {
    throw new Error('No data returned from Hasura GraphQL query');
  }

  return body.data;
}
