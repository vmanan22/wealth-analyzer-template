# Wealth Analyzer

Cloud-portable personal wealth portfolio analyzer for Indian households. The app tracks a complete balance sheet: mutual funds, stocks, EPF, NPS, bank cash, gold, real estate, LIC, goals, liabilities, CSV imports, AI advisor insights, PDF reports, and monthly snapshots.

## Stack

- Next.js App Router with TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Recharts
- NextAuth/Auth.js OAuth with Google, Apple, Facebook, plus local demo credentials
- OpenAI API for portfolio analysis
- PDF report generation
- Generic CSV importer with duplicate hashing
- Docker-first deployment for AWS, Azure, and GCP

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Set `DATABASE_URL` to a PostgreSQL database.

4. Create tables and seed neutral demo data:

```bash
npm run prisma:deploy
npm run db:seed
```

For local prototyping before migrations are adopted, `npm run db:push` is also available.

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000/login`. The local demo account is `demo@wealth.local` / `password123`.

## Docker

```bash
docker build -t wealth-analyzer .
docker run --env-file .env -p 3000:3000 wealth-analyzer
```

Use managed PostgreSQL in production and run `npm run prisma:deploy` before starting the container. See `docs/deployment.md` for AWS, Azure, and GCP notes.

## MVP Modules

- Dashboard with net worth, total assets, liabilities, SIP/contributions, allocation, liquidity, goal progress, gainers/laggards.
- Manual asset and liability entry.
- Monthly snapshot creation and historical trend charts.
- Generic CSV import with column mapping and duplicate detection.
- Goal tracker seeded with ₹5Cr, ₹10Cr, ₹25Cr, home loan closure, retirement corpus, and child education.
- Analytics for owner-level view, debt ratio, emergency fund months, concentration risk, and illiquid percentage.
- Settings for data export and local data deletion.
- OAuth login and user-scoped portfolio data.
- AI advisor page with stored educational recommendations.
- Monthly reports with PDF download.

## Sample Imports

Sample files are available in `samples/`:

- `sample-assets.csv`
- `zerodha-holdings-sample.csv`
- `bank-statement-sample.csv`
- `zerodha-holdings-import.csv`
- `cas-mf-import.csv`

The generic importer expects columns such as `name`, `invested_amount`, `current_value`, and `transaction_date`. Rows can also include `assetClass`, `ownerType`, `platform`, `liquidity`, `taxCategory`, and `notes`.

## Data Console

Use `/data-console` to manage external portfolio feeds and advisor context.

- Zerodha holdings CSV import maps stocks/ETFs into assets and advisor holding facts.
- CAS/CAMS/KFintech/MFCentral CSV import maps mutual funds into assets and advisor MF facts.
- NSE market context is represented as a licensed-feed placeholder. Do not scrape NSE pages in production.
- LIC, EPFO, NPS, land/real estate, and Account Aggregator are modeled as future/manual/upload connectors.
- Advisor context items always include source, as-of date, confidence, and staleness metadata.

## Privacy And Security

- Passwords are hashed with bcrypt.
- OAuth sessions are handled by NextAuth/Auth.js.
- No secrets are exposed to the frontend.
- No bank, Kuvera, Zerodha, or EPFO passwords are stored or requested.
- AI analysis excludes credentials and is educational only, not SEBI-registered advice.
- The public template defaults to decision-support only. It does not produce direct personalized buy/sell orders or target-price instructions.
- Future integrations should use OAuth, API tokens, or consent-based Account Aggregator flows.
- Export and delete-all-user-data controls are included in Settings.
- Run `npm audit` before deployment; the committed dependency set is expected to report zero vulnerabilities.

## Future TODOs

- Dedicated Kuvera/CAMS/KFintech CAS parser.
- Zerodha Kite Connect OAuth integration for holdings and positions.
- Licensed/permitted market data provider adapter for NSE quote context.
- Account Aggregator consent flow for bank and financial data.
- EPFO passbook and NPS CRA statement importers.
- XIRR, CAGR, tax lot, and redeemable amount calculations.
- Asset-goal mapping table for precise goal allocation.
- Stronger auth/session management before internet deployment.
- Object-storage adapter for persisted report PDFs.
