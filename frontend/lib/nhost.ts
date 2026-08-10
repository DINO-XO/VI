import { NhostClient } from '@nhost/nextjs';

export const nhost = new NhostClient({
  subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || 'vfpldelxmutaipflovkl',
  region: process.env.NEXT_PUBLIC_NHOST_REGION || 'ap-south-1',
  authUrl: 'https://vfpldelxmutaipflovkl.auth.ap-south-1.nhost.run/v1',
  graphqlUrl: 'https://vfpldelxmutaipflovkl.hasura.ap-south-1.nhost.run/v1/graphql',
});
