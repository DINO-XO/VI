import { hasuraAdminQuery } from '../functions/_lib/hasura-client.js';

async function seed() {
  console.log('🌱 Seeding database for AI Agent Workflow Builder...');

  try {
    // 1. Create Organizations
    console.log('Creating organizations...');
    const orgRes = await hasuraAdminQuery(`
      mutation SeedOrgs {
        orgA: insert_organizations_one(object: {
          name: "Acme Corp (Org A)",
          quota_calls_allowed: 50,
          quota_calls_used: 0
        }) { id }
        orgB: insert_organizations_one(object: {
          name: "Stark Industries (Org B)",
          quota_calls_allowed: 50,
          quota_calls_used: 0
        }) { id }
      }
    `);

    const orgAId = orgRes.orgA.id;
    const orgBId = orgRes.orgB.id;

    // Fixed test user UUIDs for deterministic seed
    const userOwnerA = '11111111-1111-1111-1111-111111111111';
    const userEditorA = '22222222-2222-2222-2222-222222222222';
    const userViewerA = '33333333-3333-3333-3333-333333333333';
    const userOwnerB = '44444444-4444-4444-4444-444444444444';
    const userEditorB = '55555555-5555-5555-5555-555555555555';

    // 2. Insert Org Memberships
    console.log('Creating org memberships...');
    await hasuraAdminQuery(`
      mutation SeedMembers($orgA: uuid!, $orgB: uuid!) {
        insert_org_members(objects: [
          { org_id: $orgA, user_id: "${userOwnerA}", role: "owner" },
          { org_id: $orgA, user_id: "${userEditorA}", role: "editor" },
          { org_id: $orgA, user_id: "${userViewerA}", role: "viewer" },
          { org_id: $orgB, user_id: "${userOwnerB}", role: "owner" },
          { org_id: $orgB, user_id: "${userEditorB}", role: "editor" }
        ]) {
          affected_rows
        }
      }
    `, { orgA: orgAId, orgB: orgBId });

    // 3. Create Seed Workflow in Org A
    console.log('Creating seed workflow in Org A...');
    const wfRes = await hasuraAdminQuery(`
      mutation SeedWorkflow($orgId: uuid!, $createdBy: uuid!) {
        insert_workflows_one(object: {
          org_id: $orgId,
          name: "Customer Support AI & HTTP Pipeline",
          description: "4-Step workflow: LLM Call -> Conditional Branch -> HTTP Request -> Approval Gate",
          created_by: $createdBy
        }) { id }
      }
    `, { orgId: orgAId, createdBy: userOwnerA });

    const workflowId = wfRes.insert_workflows_one.id;

    // 4. Create Workflow Steps
    console.log('Creating workflow steps...');
    await hasuraAdminQuery(`
      mutation SeedSteps($wfId: uuid!) {
        insert_workflow_steps(objects: [
          {
            workflow_id: $wfId,
            step_order: 1,
            type: "llm_call",
            config: { prompt: "Analyze customer sentiment for: 'I love this automated workflow tool!'" }
          },
          {
            workflow_id: $wfId,
            step_order: 2,
            type: "conditional_branch",
            config: { condition: { if_output_contains: "yes", else_skip_to: 4 } }
          },
          {
            workflow_id: $wfId,
            step_order: 3,
            type: "http_request",
            config: { url: "https://api.chucknorris.io/jokes/random", method: "GET" }
          },
          {
            workflow_id: $wfId,
            step_order: 4,
            type: "approval_gate",
            config: { message: "Requires Owner/Editor approval to complete run" }
          }
        ]) {
          affected_rows
        }
      }
    `, { wfId: workflowId });

    // 5. Create Workflow Triggers
    console.log('Creating workflow triggers...');
    await hasuraAdminQuery(`
      mutation SeedTriggers($wfId: uuid!) {
        insert_workflow_triggers(objects: [
          { workflow_id: $wfId, type: "manual", config: {} },
          { workflow_id: $wfId, type: "webhook", config: { secret: "demo-secret-1234" } }
        ]) {
          affected_rows
        }
      }
    `, { wfId: workflowId });

    console.log('✅ Seed complete!');
    console.log(`Org A ID: ${orgAId}`);
    console.log(`Org B ID: ${orgBId}`);
    console.log(`Org A Workflow ID: ${workflowId}`);
    console.log(`Webhook Trigger Secret: demo-secret-1234`);
  } catch (err) {
    console.error('❌ Seed failed:', err);
  }
}

seed();
