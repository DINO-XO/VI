/**
 * setup-permissions.ts
 * Applies Hasura table permissions, relationships, and Actions via Metadata API.
 * Run with: npx tsx scripts/setup-permissions.ts
 */

const HASURA_URL =
  process.env.NHOST_HASURA_URL ||
  'https://vfpldelxmutaipflovkl.hasura.ap-south-1.nhost.run';

const ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET || '@V\'B\'+ZfLEK,MR:g7QnB2hc:j3KWrwkX';
const FUNCTIONS_URL = process.env.FUNCTIONS_BASE_URL || 'http://localhost:1337/v1';

async function metadataApi(body: any) {
  if (!ADMIN_SECRET) {
    throw new Error('Please set NHOST_ADMIN_SECRET env var.');
  }
  const res = await fetch(`${HASURA_URL}/v1/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify(body),
  });
  return await res.json();
}

async function apply(type: string, args: any): Promise<boolean> {
  const table = args.table?.name || args.name || '?';
  const role = args.role || '';
  const op = type.replace('pg_create_', '').replace('_permission', '');

  const result = await metadataApi({ type, args });

  if (result?.message === 'success') {
    console.log(`  ✅  ${role ? role + '/' : ''}${table} [${op}]`);
    return true;
  } else {
    const err = result?.error || result?.code || JSON.stringify(result);
    console.log(`  ⚠️   ${role ? role + '/' : ''}${table} [${op}] — ${err.slice(0, 70)}`);
    return false;
  }
}

async function dropPermission(table: string, role: string, permType: string) {
  await metadataApi({
    type: `pg_drop_${permType}_permission`,
    args: { source: 'default', table: { schema: 'public', name: table }, role },
  });
}

// ─── Track Relationships ──────────────────────────────────────────────────────

async function trackRelationships() {
  console.log('\n📡 Tracking foreign-key relationships...\n');

  const rels: Array<{ type: string; args: any }> = [
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'org_members' },
        name: 'organization',
        using: { foreign_key_constraint_on: 'org_id' },
      },
    },
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'organizations' },
        name: 'org_members',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'org_members' },
            column: 'org_id',
          },
        },
      },
    },
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'workflows' },
        name: 'organization',
        using: { foreign_key_constraint_on: 'org_id' },
      },
    },
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'organizations' },
        name: 'workflows',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'workflows' },
            column: 'org_id',
          },
        },
      },
    },
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'workflow_steps' },
        name: 'workflow',
        using: { foreign_key_constraint_on: 'workflow_id' },
      },
    },
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'workflows' },
        name: 'workflow_steps',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'workflow_steps' },
            column: 'workflow_id',
          },
        },
      },
    },
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'workflow_triggers' },
        name: 'workflow',
        using: { foreign_key_constraint_on: 'workflow_id' },
      },
    },
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'workflows' },
        name: 'workflow_triggers',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'workflow_triggers' },
            column: 'workflow_id',
          },
        },
      },
    },
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'workflow_runs' },
        name: 'organization',
        using: { foreign_key_constraint_on: 'org_id' },
      },
    },
    {
      type: 'pg_create_array_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'workflows' },
        name: 'workflow_runs',
        using: {
          foreign_key_constraint_on: {
            table: { schema: 'public', name: 'workflow_runs' },
            column: 'workflow_id',
          },
        },
      },
    },
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'step_runs' },
        name: 'workflow_run',
        using: { foreign_key_constraint_on: 'workflow_run_id' },
      },
    },
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'notifications' },
        name: 'organization',
        using: { foreign_key_constraint_on: 'org_id' },
      },
    },
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'org_usage_summary' },
        name: 'organization',
        using: {
          manual_configuration: {
            remote_table: { schema: 'public', name: 'organizations' },
            column_mapping: { org_id: 'id' },
          },
        },
      },
    },
    {
      type: 'pg_create_object_relationship',
      args: {
        source: 'default',
        table: { schema: 'public', name: 'organizations' },
        name: 'org_usage_summary',
        using: {
          manual_configuration: {
            remote_table: { schema: 'public', name: 'org_usage_summary' },
            column_mapping: { id: 'org_id' },
          },
        },
      },
    },
  ];

  for (const { type, args } of rels) {
    await apply(type, args);
  }
}

// ─── Table Permissions ────────────────────────────────────────────────────────

async function applyPermissions() {
  console.log('\n🔐 Updating Table Permissions...\n');

  const src = 'default';
  const tbl = (name: string) => ({ schema: 'public', name });
  const openFilter = () => ({});

  // Direct user_id check on org_members table
  const directUserIdFilter = () => ({
    user_id: { _eq: 'X-Hasura-User-Id' },
  });

  const orgMembersFilter = () => ({
    org_members: { user_id: { _eq: 'X-Hasura-User-Id' } },
  });

  // ── org_members (Drop & Reapply with direct user_id filter) ──
  for (const role of ['user', 'owner', 'editor', 'viewer']) {
    await dropPermission('org_members', role, 'select');
    await apply('pg_create_select_permission', {
      source: src, table: tbl('org_members'), role,
      permission: { columns: '*', filter: directUserIdFilter() },
    });
  }

  // ── organizations ──
  for (const role of ['user', 'owner', 'editor', 'viewer']) {
    await dropPermission('organizations', role, 'select');
    await apply('pg_create_select_permission', {
      source: src, table: tbl('organizations'), role,
      permission: { columns: '*', filter: orgMembersFilter(), allow_aggregations: true },
    });
  }

  // ── workflows ──
  for (const role of ['user', 'owner', 'editor', 'viewer']) {
    await dropPermission('workflows', role, 'select');
    await apply('pg_create_select_permission', {
      source: src, table: tbl('workflows'), role,
      permission: { columns: '*', filter: { organization: orgMembersFilter() } },
    });
  }

  // ── workflow_steps ──
  for (const role of ['user', 'owner', 'editor', 'viewer']) {
    await dropPermission('workflow_steps', role, 'select');
    await apply('pg_create_select_permission', {
      source: src, table: tbl('workflow_steps'), role,
      permission: { columns: '*', filter: openFilter() },
    });
  }

  // ── workflow_triggers ──
  for (const role of ['user', 'owner', 'editor', 'viewer']) {
    await dropPermission('workflow_triggers', role, 'select');
    await apply('pg_create_select_permission', {
      source: src, table: tbl('workflow_triggers'), role,
      permission: { columns: '*', filter: openFilter() },
    });
  }

  // ── workflow_runs ──
  for (const role of ['user', 'owner', 'editor', 'viewer']) {
    await dropPermission('workflow_runs', role, 'select');
    await apply('pg_create_select_permission', {
      source: src, table: tbl('workflow_runs'), role,
      permission: { columns: '*', filter: openFilter() },
    });
  }

  // ── step_runs ──
  for (const role of ['user', 'owner', 'editor', 'viewer']) {
    await dropPermission('step_runs', role, 'select');
    await apply('pg_create_select_permission', {
      source: src, table: tbl('step_runs'), role,
      permission: { columns: '*', filter: openFilter() },
    });
  }
}

async function main() {
  await trackRelationships();
  await applyPermissions();
  console.log('\n🎉 Permissions updated successfully!\n');
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message || err);
  process.exit(1);
});
