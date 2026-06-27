# Cloud Deployment

Wealth Analyzer is designed to run as a Dockerized Next.js app with managed PostgreSQL. The same image can run on AWS, Azure, or GCP when the correct environment variables are supplied.

## Required Runtime Variables

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `APP_BASE_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## Local Container

```bash
docker build -t wealth-analyzer .
docker run --env-file .env -p 3000:3000 wealth-analyzer
```

Run database migrations before starting a production deployment:

```bash
npx prisma migrate deploy
```

For local prototype databases only, `npm run db:push` is acceptable.

## AWS

- App: AWS App Runner or ECS Fargate
- Database: Amazon RDS for PostgreSQL
- Secrets: AWS Secrets Manager or App Runner environment secrets
- Health check: `/api/health`
- OAuth callback: `https://your-domain.com/api/auth/callback/google`

## Azure

- App: Azure Container Apps or Azure App Service for Containers
- Database: Azure Database for PostgreSQL Flexible Server
- Secrets: Azure Key Vault or Container Apps secrets
- Health check: `/api/health`
- OAuth callback: `https://your-domain.com/api/auth/callback/google`

## GCP

- App: Cloud Run
- Database: Cloud SQL for PostgreSQL
- Secrets: Secret Manager
- Health check: `/api/health`
- OAuth callback: `https://your-domain.com/api/auth/callback/google`

## Security Notes

- Always run behind HTTPS in production.
- Store OAuth and OpenAI keys in cloud secret stores.
- Do not persist generated PDFs to local disk; generate on demand or add a future object-storage adapter.
- Enable automated managed PostgreSQL backups.
- Rotate `NEXTAUTH_SECRET` only with a planned session invalidation window.
