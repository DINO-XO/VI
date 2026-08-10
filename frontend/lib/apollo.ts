import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { nhost } from './nhost';

export function createApolloClient(accessToken?: string | null) {
  const graphqlUrl =
    process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL ||
    'https://vfpldelxmutaipflovkl.hasura.ap-south-1.nhost.run/v1/graphql';
  const wsUrl = graphqlUrl.replace(/^http/, 'ws');

  const httpLink = new HttpLink({
    uri: graphqlUrl,
  });

  const authLink = setContext((_, { headers }) => {
    // Dynamically get latest token from Nhost SDK if available
    const token = accessToken || nhost.auth.getAccessToken();

    return {
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-hasura-role': 'user',
      },
    };
  });

  const wsLink =
    typeof window !== 'undefined'
      ? new GraphQLWsLink(
          createClient({
            url: wsUrl,
            connectionParams: () => {
              const token = accessToken || nhost.auth.getAccessToken();
              return {
                headers: {
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  'x-hasura-role': 'user',
                },
              };
            },
          })
        )
      : null;

  const splitLink =
    typeof window !== 'undefined' && wsLink
      ? split(
          ({ query }) => {
            const definition = getMainDefinition(query);
            return (
              definition.kind === 'OperationDefinition' &&
              definition.operation === 'subscription'
            );
          },
          wsLink,
          authLink.concat(httpLink)
        )
      : authLink.concat(httpLink);

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
  });
}
