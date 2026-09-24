# agent-platform-ux

A UX prototype of an enterprise **agent platform**: governed skills, tools, data and context are put together into **capabilities**, staffed by **agent pods**, run from a chat, and signed off by a person. Everything is simulated. "Northwind" is a fictional pharma company, and all data, people and numbers are synthetic.

Built as a [Databricks App](https://docs.databricks.com/aws/en/dev-tools/databricks-apps/) on [AppKit](https://developers.databricks.com/docs/appkit/v0/) (React, TypeScript, Tailwind). No backend data: state lives in memory and resets on reload.

## What's in it

- **Ask** (chat-first): describe an outcome; a composer drafts a pod; a person approves; agents run in parallel (including a blocked-access and a retry moment); a cited report waits for sign-off.
- **Capabilities**: skills + tools + data + context (with Genie Ontology snippets), a link map, a composer with a Map | YAML toggle, and a generated manifest.
- **Agents**: one kind of agent, each with an **Agent Card**: who it acts on behalf of, and what it can reach for that person (effective access = agent grants ∩ the person's access).
- **Metadata-driven development**: every agent, capability and pod is a YAML manifest; the app shows what a platform loader would generate from it (identity, Unity Catalog grants, AI Gateway policy, evals, an AppKit `agent.md`).
- **Pods, Work, Governance**: pod versions and promotion, work queue, maturity and spend, access denials, certification.
- **Presenter mode**: an 11-step guided walkthrough.

## Run it

```bash
npm install
npm run build && npm start      # http://localhost:8000
```

Deploy to your own workspace: set `workspace.host` in `databricks.yml`, then

```bash
databricks bundle deploy --profile <PROFILE> && databricks bundle run app --profile <PROFILE>
```

---

The rest of this file is the standard AppKit template README.


**Enabled plugins:**
- **Server** -- Express HTTP server with static file serving and Vite dev mode

## Prerequisites

- Node.js v22+ and npm
- Databricks CLI (for deployment)
- Access to a Databricks workspace

## Databricks Authentication

### Local Development

For local development, configure your environment variables by creating a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set the environment variables you need:

```env
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_APP_PORT=8000
# ... other environment variables, depending on the plugins you use
```

### CLI Authentication

The Databricks CLI requires authentication to deploy and manage apps. Configure authentication using one of these methods:

#### OAuth U2M

Interactive browser-based authentication with short-lived tokens:

```bash
databricks auth login --host https://your-workspace.cloud.databricks.com
```

This will open your browser to complete authentication. The CLI saves credentials to `~/.databrickscfg`.

#### Configuration Profiles

Use multiple profiles for different workspaces:

```ini
[DEFAULT]
host = https://dev-workspace.cloud.databricks.com

[production]
host = https://prod-workspace.cloud.databricks.com
client_id = prod-client-id
client_secret = prod-client-secret
```

Deploy using a specific profile:

```bash
databricks bundle deploy --profile production
```

**Note:** Personal Access Tokens (PATs) are legacy authentication. OAuth is strongly recommended for better security.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

Run the app in development mode with hot reload:

```bash
npm run dev
```

The app will be available at the URL shown in the console output.

### Build

Build both client and server for production:

```bash
npm run build
```

This creates:

- `dist/server.js` - Compiled server bundle
- `client/dist/` - Bundled client assets

### Production

Run the production build:

```bash
npm start
```

## Code Quality

There are a few commands to help you with code quality:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:fix
```

## Deployment with Databricks Asset Bundles

### 1. Configure Bundle

Update `databricks.yml` with your workspace settings:

```yaml
targets:
  default:
    workspace:
      host: https://your-workspace.cloud.databricks.com
```

Make sure to replace all placeholder values in `databricks.yml` with your actual resource IDs.

### 2. Deploy

Deploy and start the app with a single command:

```bash
databricks apps deploy
```

`databricks apps deploy` validates the project, deploys it, starts the app, and prints its URL.

### Deploy to Production

1. Configure the production target in `databricks.yml`
2. Deploy to production:

```bash
databricks apps deploy -t prod
```

> **Restarting a stopped app:** apps stop after a period of inactivity. To start one again without redeploying, run `databricks apps start <APP_NAME>`.

## Project Structure

```
* client/          # React frontend
  * src/           # Source code
  * public/        # Static assets
* server/          # Express backend
  * server.ts      # Server entry point
  * routes/        # Routes
* shared/          # Shared types
* databricks.yml   # Bundle configuration
* app.yaml         # App configuration
* .env.example     # Environment variables example
```

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: React.js, TypeScript, Vite, Tailwind CSS, React Router
- **UI Components**: Radix UI, shadcn/ui
- **Databricks**: AppKit SDK
