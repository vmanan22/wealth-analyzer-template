# Wealth Analyzer

Full-stack personal wealth portfolio analyzer for an Indian household. The MVP tracks a complete balance sheet: mutual funds, stocks, EPF, NPS, bank cash, gold, real estate, LIC, goals, liabilities, CSV imports, and monthly snapshots.

## Stack

- Next.js App Router with TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Recharts
- Local MVP authentication with bcrypt
- Generic CSV importer with duplicate hashing

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

4. Create tables and seed realistic demo data:

```bash
npm run db:push
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000/dashboard`.

## MVP Modules

- Dashboard with net worth, total assets, liabilities, SIP/contributions, allocation, liquidity, goal progress, gainers/laggards.
- Manual asset and liability entry.
- Monthly snapshot creation and historical trend charts.
- Generic CSV import with column mapping and duplicate detection.
- Goal tracker seeded with ₹5Cr, ₹10Cr, ₹25Cr, home loan closure, retirement corpus, and child education.
- Analytics for owner-level view, debt ratio, emergency fund months, concentration risk, and illiquid percentage.
- Settings for data export and local data deletion.

## Sample Imports

Sample files are available in `samples/`:

- `sample-assets.csv`
- `zerodha-holdings-sample.csv`
- `bank-statement-sample.csv`

The generic importer expects columns such as `name`, `invested_amount`, `current_value`, and `transaction_date`. Rows can also include `assetClass`, `ownerType`, `platform`, `liquidity`, `taxCategory`, and `notes`.

## Privacy And Security

- Passwords are hashed with bcrypt.
- No secrets are exposed to the frontend.
- No bank, Kuvera, Zerodha, or EPFO passwords are stored or requested.
- Future integrations should use OAuth, API tokens, or consent-based Account Aggregator flows.
- Export and delete-all-user-data controls are included in Settings.

## Future TODOs

- Dedicated Kuvera/CAMS/KFintech CAS parser.
- Zerodha Kite Connect OAuth integration for holdings and positions.
- Account Aggregator consent flow for bank and financial data.
- EPFO passbook and NPS CRA statement importers.
- XIRR, CAGR, tax lot, and redeemable amount calculations.
- Asset-goal mapping table for precise goal allocation.
- Stronger auth/session management before internet deployment.
