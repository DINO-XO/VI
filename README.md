# AI Agent Workflow Builder 🚀

A production-quality, multi-tenant AI workflow automation platform (built on **Nhost + Hasura + Postgres + GraphQL + Next.js**).

---

## 🌟 Key Features & Architecture

* **Multi-Tenant Organizations**: Org isolation at the database layer via Hasura row-level permissions.
* **Role-Based Access Control (RBAC)**:
  * 🟣 **`OWNER`**: Unrestricted control. Only owners can execute/configure `db_write`, `notify` steps, or create Webhook triggers.
  * 🔵 **`EDITOR`**: Can construct workflows, add steps (`llm_call`, `http_request`, `approval_gate`), approve steps, and click **Run**.
  * ⚪ **`VIEWER`**: Read-only access. Run buttons and creation controls are automatically hidden.
* **6 Execution Engine Step Types**:
  1. `llm_call`: Prompts Groq / LLM for sentiment & text generation.
  2. `http_request`: Fetches external REST APIs.
  3. `db_write`: Saves output directly to PostgreSQL.
  4. `notify`: Inserts notification & triggers Hasura Event Trigger (`notify-stub`).
  5. `conditional_branch`: Evaluates previous step output (`if_output_contains`) and jumps dynamically.
  6. `approval_gate`: Pauses run in `paused_awaiting_approval` state until human clicks **"Approve"**.
* **Triggers**: Manual UI button, Webhook cURL secret, Schedule, and DB Events.
* **Live Real-Time Subscriptions**: Runs stream step statuses (`PENDING` → `RUNNING` → `SUCCEEDED` / `FAILED` / `PAUSED`) live over WebSockets.

---

## 📁 Repository Structure

```
├── nhost/                    # Nhost backend configuration & Hasura metadata
│   ├── nhost.toml
│   ├── metadata/            # Hasura tracked tables, relationships, & custom actions
│   └── migrations/          # PostgreSQL schema migrations
├── functions/                # Node.js Serverless Functions
│   ├── _lib/                # Step runner engine, Hasura client, LLM integration
│   ├── trigger-workflow-run.ts
│   ├── trigger-workflow-webhook.ts
│   ├── approve-step.ts
│   └── upsert-workflow-step.ts
├── frontend/                 # Next.js 14 App Router UI (Tailwind CSS + Apollo Client)
│   ├── app/                 # Dashboard & Auth pages
│   ├── components/          # WorkflowBuilder, StepCard, OrgSelector, QuotaWidget
│   └── lib/                 # Apollo Client, OrgContext, GraphQL queries/mutations
└── scripts/                  # Permission setup & seeding scripts
    ├── setup-permissions.ts # Applies Hasura metadata & table permissions
    └── link-demo-members.ts # Seeds demo accounts (Owner, Editor, Viewer)
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
# Frontend
cd frontend
npm install

# Functions
cd ../functions
npm install
```

### 2. Apply Hasura Permissions & Setup Demo Roles
```bash
$env:NHOST_ADMIN_SECRET="<YOUR_ADMIN_SECRET>"
npx tsx scripts/setup-permissions.ts
npx tsx scripts/link-demo-members.ts
```

### 3. Run Local Dev Server
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 👥 Demo Quick Fill Accounts

| Account Email | Role | Organization |
|---|---|---|
| `owner@a.com` | **OWNER** | Acme Corp (Org A) |
| `editor@a.com` | **EDITOR** | Acme Corp (Org A) |
| `viewer@a.com` | **VIEWER** | Acme Corp (Org A) |
| `owner@b.com` | **OWNER** | Stark Corp (Org B) |

*Default password for all demo accounts:* `password123`
