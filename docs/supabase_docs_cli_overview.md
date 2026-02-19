Local Dev / CLI
Overview
Local Development & CLI

Learn how to develop locally and use the Supabase CLI

Develop locally while running the Supabase stack on your machine.

As a prerequisite, you must install a container runtime compatible with Docker APIs.

Docker Desktop (macOS, Windows, Linux)
Rancher Desktop (macOS, Windows, Linux)
Podman (macOS, Windows, Linux)
OrbStack (macOS)
Quickstart#
Install the Supabase CLI:


npm

yarn

pnpm

brew
npm install supabase --save-dev
In your repo, initialize the Supabase project:


npm

yarn

pnpm

brew
npx supabase init
Start the Supabase stack:


npm

yarn

pnpm

brew
npx supabase start
View your local Supabase instance at http://localhost:54323.

If your local development machine is connected to an untrusted public network, you should create a separate docker network and bind to 127.0.0.1 before starting the local development stack. This restricts network access to only your localhost machine.

docker network create -o 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1' local-network
npx supabase start --network-id local-network
You should never expose your local development stack publicly.

Local development#
Local development with Supabase allows you to work on your projects in a self-contained environment on your local machine. Working locally has several advantages:

Faster development: You can make changes and see results instantly without waiting for remote deployments.
Offline work: You can continue development even without an internet connection.
Cost-effective: Local development is free and doesn't consume your project's quota.
Enhanced privacy: Sensitive data remains on your local machine during development.
Easy testing: You can experiment with different configurations and features without affecting your production environment.
To get started with local development, you'll need to install the Supabase CLI and Docker. The Supabase CLI allows you to start and manage your local Supabase stack, while Docker is used to run the necessary services.

Once set up, you can initialize a new Supabase project, start the local stack, and begin developing your application using local Supabase services. This includes access to a local Postgres database, Auth, Storage, and other Supabase features.

CLI#
The Supabase CLI is a powerful tool that enables developers to manage their Supabase projects directly from the terminal. It provides a suite of commands for various tasks, including:

Setting up and managing local development environments
Generating TypeScript types for your database schema
Handling database migrations
Managing environment variables and secrets
Deploying your project to the Supabase platform
With the CLI, you can streamline your development workflow, automate repetitive tasks, and maintain consistency across different environments. It's an essential tool for both local development and CI/CD pipelines.

See the CLI Getting Started guide for more information.