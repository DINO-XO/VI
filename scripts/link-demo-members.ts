/**
 * link-demo-members.ts
 * Links Nhost auth users (owner@a.com, editor@a.com, viewer@a.com, owner@b.com)
 * to demo organizations with exact roles (OWNER, EDITOR, VIEWER) for testing.
 * Run with: npx tsx scripts/link-demo-members.ts
 */

const HASURA_URL =
  process.env.NHOST_HASURA_URL ||
  'https://vfpldelxmutaipflovkl.hasura.ap-south-1.nhost.run';

const ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET || '@V\'B\'+ZfLEK,MR:g7QnB2hc:j3KWrwkX';

async function graphql(query: string, variables: any = {}) {
  const res = await fetch(`${HASURA_URL}/v1/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }
  return data.data;
}

async function main() {
  console.log('👥 Setting up Demo Organizations & Roles (Owner, Editor, Viewer)...\n');

  // 1. Fetch all auth users from Hasura auth.users table
  const authUsersData = await graphql(`
    query GetUsers {
      users {
        id
        email
      }
    }
  `);

  const users: Array<{ id: string; email: string }> = authUsersData.users || [];
  console.log(`Found ${users.length} registered auth user(s):`, users.map(u => u.email).join(', '));

  const findUser = (email: string) => users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  const ownerA = findUser('owner@a.com');
  const editorA = findUser('editor@a.com');
  const viewerA = findUser('viewer@a.com');
  const ownerB = findUser('owner@b.com');

  if (!ownerA) {
    console.log('\n⚠️  owner@a.com has not signed up yet. Please log into the app with owner@a.com once.');
  }

  // 2. Create or get "Acme Corp (Org A)"
  console.log('\n🏢 Setting up Acme Corp (Org A)...');
  const orgARes = await graphql(`
    mutation CreateOrgA {
      insert_organizations_one(
        object: { name: "Acme Corp (Org A)", quota_calls_allowed: 1000 }
        on_conflict: { constraint: organizations_pkey, update_columns: [name] }
      ) {
        id
        name
      }
    }
  `);

  const orgAId = orgARes.insert_organizations_one.id;
  console.log(`  Acme Corp ID: ${orgAId}`);

  // 3. Link Members to Org A with precise roles
  const orgAMembers: Array<{ user_id: string; role: string; label: string }> = [];

  if (ownerA) orgAMembers.push({ user_id: ownerA.id, role: 'owner', label: 'owner@a.com (OWNER)' });
  if (editorA) orgAMembers.push({ user_id: editorA.id, role: 'editor', label: 'editor@a.com (EDITOR)' });
  if (viewerA) orgAMembers.push({ user_id: viewerA.id, role: 'viewer', label: 'viewer@a.com (VIEWER)' });

  for (const m of orgAMembers) {
    await graphql(
      `
        mutation LinkMember($org_id: uuid!, $user_id: uuid!, $role: String!) {
          insert_org_members_one(
            object: { org_id: $org_id, user_id: $user_id, role: $role }
            on_conflict: { constraint: org_members_org_id_user_id_key, update_columns: [role] }
          ) {
            id
            role
          }
        }
      `,
      { org_id: orgAId, user_id: m.user_id, role: m.role }
    );
    console.log(`  ✅  Linked ${m.label} to Acme Corp`);
  }

  // 4. Create or get "Stark Corp (Org B)" for owner@b.com
  if (ownerB) {
    console.log('\n🏢 Setting up Stark Corp (Org B)...');
    const orgBRes = await graphql(`
      mutation CreateOrgB {
        insert_organizations_one(
          object: { name: "Stark Corp (Org B)", quota_calls_allowed: 1000 }
        ) {
          id
          name
        }
      }
    `);
    const orgBId = orgBRes.insert_organizations_one.id;

    await graphql(
      `
        mutation LinkOwnerB($org_id: uuid!, $user_id: uuid!) {
          insert_org_members_one(
            object: { org_id: $org_id, user_id: $user_id, role: "owner" }
            on_conflict: { constraint: org_members_org_id_user_id_key, update_columns: [role] }
          ) {
            id
          }
        }
      `,
      { org_id: orgBId, user_id: ownerB.id }
    );
    console.log(`  ✅  Linked owner@b.com (OWNER) to Stark Corp`);
  }

  // 5. Create Sample Workflow in Acme Corp
  if (ownerA) {
    console.log('\n⚡ Creating Sample Workflow in Acme Corp...');
    const wfRes = await graphql(
      `
        mutation CreateSampleWf($org_id: uuid!, $created_by: uuid!) {
          insert_workflows_one(
            object: {
              org_id: $org_id
              name: "Customer Support AI Pipeline"
              description: "4-Step automated pipeline: LLM Call -> Approval Gate -> HTTP Request -> DB Write"
              created_by: $created_by
              workflow_steps: {
                data: [
                  {
                    step_order: 1
                    type: "llm_call"
                    config: { prompt: "Analyze customer sentiment: 'I love this workflow automation platform!'" }
                  }
                  {
                    step_order: 2
                    type: "approval_gate"
                    config: { message: "Requires Owner/Editor approval to proceed" }
                  }
                  {
                    step_order: 3
                    type: "http_request"
                    config: { url: "https://api.chucknorris.io/jokes/random", method: "GET" }
                  }
                ]
              }
            }
          ) {
            id
            name
          }
        }
      `,
      { org_id: orgAId, created_by: ownerA.id }
    );
    console.log(`  ✅  Sample Workflow Created: ${wfRes.insert_workflows_one.name}`);
  }

  console.log('\n🎉 Demo setup complete!\n');
}

main().catch((err) => {
  console.error('\n❌ Setup error:', err.message || err);
});
