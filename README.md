# Marketplace Catalog


A small Nuxt 4 full-stack application that imports a marketplace product feed
from XML and exposes the resulting catalog through an authenticated web
interface. It includes passwordless login, protected category and product APIs,
catalog filters, pagination, and a manual import command.


See [DECISIONS.md](./DECISIONS.md) for the architectural decisions, assumptions,
trade-offs, and production improvements.


## Tech stack


- Nuxt 4, Vue 3, TypeScript, Nitro, and H3
- PostgreSQL 16 in Docker
- Prisma 7 with the PostgreSQL driver adapter
- `saxes` for streaming XML parsing
- Zod for request validation
- Vitest for focused unit tests
- pnpm


## Prerequisites


- Node.js 22 or another version supported by the installed Nuxt release
- pnpm
- Docker with Docker Compose


## Run the project from scratch


### 1. Install dependencies


```bash
pnpm install
```


### 2. Configure the environment


Copy the local example:


```bash
cp .env.example .env
```


The default values are intended only for local Docker development:


```dotenv
POSTGRES_DB=marketplace_catalog
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DB_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/marketplace_catalog?schema=public
```


`DATABASE_URL` is used by Prisma, the application server, the seed command, and
the importer. The `POSTGRES_*` and `DB_PORT` variables configure Docker Compose.
Do not commit real production credentials.


`CATALOG_FEED_URL` is required only when running a catalog import. It accepts an
HTTP(S) URL or a local file path, so it can be supplied directly with the
command rather than stored in `.env`.


### 3. Start PostgreSQL


```bash
docker compose up -d
```


Check that it is healthy:


```bash
docker compose ps
```


### 4. Apply database migrations


```bash
pnpm prisma migrate dev
```


### 5. Confirm the demo user


The migration creates the required demo user automatically with this login
email:


```text
demo@example.com
```


The seed command remains available as an optional, idempotent convenience:


```bash
pnpm prisma db seed
```


### 6. Import the fixture catalog


```bash
CATALOG_FEED_URL=./fixtures/products.xml pnpm import:catalog
```


The fixture contains 12 products across nested category paths. The command
prints inserted, updated, deleted, skipped, and deleted-category counts.


The importer treats its input as a complete feed: after a successful import,
products missing from that feed are deleted. Use a complete feed when importing
real marketplace data.


To use a remote feed:


```bash
CATALOG_FEED_URL=https://example.com/products.xml pnpm import:catalog
```


The marketplace URL in the assignment is illustrative and is not expected to
resolve unless it is replaced with a real endpoint.


### 7. Start the development server


```bash
pnpm dev
```


Open [http://localhost:3000](http://localhost:3000). The root route redirects to
the protected products page, then to `/login` when no valid session exists.


## Login flow


1. Open `/login`.
2. Enter `demo@example.com`.
3. Select **Request code**.
4. Read the six-digit one-time code from the terminal running `pnpm dev`.
5. Enter the code and sign in.


Email delivery is deliberately mocked for this assignment. The raw one-time
code is logged to the server console; only its hash is stored in PostgreSQL.
After login, the browser receives an HTTP-only session cookie and is redirected
to `/products`.


## Catalog pages


- `/products` displays products with pagination, price filters, and an option
 to exclude products whose stock is zero.
- `/categories` displays the normalized category hierarchy and direct product
 counts.
- Both pages and their APIs require a valid session.


## Tests and checks


Run the focused unit tests:


```bash
pnpm test
```


The suite covers category-path construction, product normalization, invalid
feed rows, auth validation, hashing consistency, and expiration boundaries. It
does not require a test database.


Additional checks:


```bash
pnpm typecheck
pnpm build
```


## Useful scripts


| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Nuxt development server |
| `pnpm build` | Create a production build |
| `pnpm preview` | Preview the production build locally |
| `pnpm test` | Run Vitest once |
| `pnpm typecheck` | Run Nuxt and Vue TypeScript checks |
| `pnpm import:catalog` | Import the feed from `CATALOG_FEED_URL` |
| `pnpm prisma:migrate` | Run Prisma development migrations |
| `pnpm prisma:seed` | Idempotently ensure the migrated demo user exists |
| `pnpm prisma:studio` | Open Prisma Studio |


Prisma commands can also be invoked directly, for example:


```bash
pnpm prisma migrate dev
pnpm prisma db seed
pnpm prisma studio
```


## Resetting local PostgreSQL


Stop the database while preserving its data:


```bash
docker compose down
```


To remove the local database volume and start over:


```bash
docker compose down -v
```


The second command permanently deletes the local Docker database data.
