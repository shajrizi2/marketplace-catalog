# Engineering Decisions

## Architecture

This project is built as a single Nuxt 4 application.

The frontend pages are written with Vue, and the backend API is handled through Nuxt server routes. I kept the larger backend logic outside the route handlers and placed it under `server/services`. Shared backend utilities, such as Prisma access, cookies, and authorization helpers, are placed under `server/utils`.

For this assignment, I think this structure is a good balance. A separate backend service would add more setup, more deployment complexity, and more moving parts, without giving much benefit for the current scope.

The main flow of the application is:

```text
XML feed -> XML parser -> staging table -> catalog sync -> PostgreSQL

Browser -> Nuxt pages -> protected API routes -> Prisma -> PostgreSQL
```

## Database Design

PostgreSQL is used as the main database, with Prisma handling the schema, migrations, and normal database access.

The main models are:

* `User`, `LoginCode`, and `Session` for passwordless authentication
* `Category` for the category hierarchy
* `Product` for catalog products
* `ImportRun` for tracking each catalog import
* `ProductImportRow` as a temporary staging table during import

I used UUIDs as internal IDs because the external feed does not provide reliable database identifiers.

Prices are stored as `Decimal` instead of floating-point numbers, because prices should not lose precision. Stock is stored as an integer. I also added indexes on fields that are used for filtering, lookup, and import tracking.

## Product Identity

The feed does not provide a separate product ID, so I used `sku` as the unique product identity.

This is an assumption I would want to confirm in a real integration. If the marketplace changes or reuses SKUs, the importer would treat that as an update or a new product. But based on the provided feed structure, SKU is the best available stable identifier.

If the same SKU appears more than once in one feed, the importer keeps the latest staged row. In a production system, I would also store or report duplicate SKUs so they can be investigated.

## Category Identity

The feed provides categories as text paths, for example:

```text
Electronics | Phones | Smartphones
```

There is no category ID, so I use the normalized full category path as the unique category identity.

This allows the same category name to exist under different parents. For example, `Accessories` under `Phones` and `Accessories` under `Laptops` can be treated as different categories.

The trade-off is that if a category is renamed or moved, the importer cannot know whether it is the same category or a new one. With the current feed data, there is no better way to detect that.

## Product Category

Each product is assigned to the leaf category, which is the last segment of the category path.

For example:

```text
Electronics | Phones | Smartphones
```

The product is assigned to `Smartphones`, while `Electronics` and `Phones` are kept as parent categories.

The category API currently shows the direct product count for each category. It does not aggregate products from child categories. This keeps the query simple and clear for the assignment.

After stale products are removed, the importer also removes empty categories. It only deletes categories that have no products and no child categories. This is done repeatedly so that empty parent categories are also cleaned up after their children are removed.

## Importer Design

The feed can contain more than 50,000 products, so I did not want to load the full catalog into memory and then process it all at once.

The importer parses the XML feed incrementally and writes normalized rows into `ProductImportRow` in batches. The category list is small compared to the product list, so keeping category paths in memory is acceptable for this assignment.

The import process is:

1. Start an `ImportRun`
2. Read and parse the XML feed
3. Store normalized rows in the staging table
4. Create missing category levels
5. Insert or update products by SKU
6. Mark products with the current import run
7. Delete products that were not seen in the latest import
8. Remove empty categories
9. Clear staging rows
10. Mark the import as successful

The product synchronization uses a focused raw PostgreSQL upsert statement. I chose this because doing tens of thousands of individual Prisma upserts would create too many database calls and would be slower. Prisma is still used for the schema, migrations, and most normal queries.

Invalid product rows are skipped and counted in the import statistics. A row is considered invalid if required fields like title, SKU, category, price, or stock are missing or invalid. Description is allowed to be empty.

An empty feed is accepted as a valid empty catalog. However, if a non-empty feed contains only invalid rows, the importer fails instead of wiping the existing catalog. This is a safety decision.

The importer can read from a remote URL or from a local XML file. Manual execution is done through the `CATALOG_FEED_URL` environment variable.

## Authentication Design

Authentication is passwordless and only works for users that already exist in the database.

A user can request a login code by email. The API returns a generic response so it does not intentionally reveal whether the email exists. The code is logged to the server console instead of being sent through a real email provider, which is acceptable for this assignment.

Login codes:

* are six digits
* expire after about 10 minutes
* are single-use
* are generated using Node crypto APIs
* are stored only as hashes

When a code is verified successfully, it is marked as used and a session is created. The raw session token is sent to the browser in an HTTP-only cookie, while only the hashed token is stored in the database.

The session cookie uses `SameSite=Lax` and is marked secure in production.

In a production system, I would add rate limiting, attempt limits, real email delivery, monitoring, and stronger abuse protection.

## API Design

The API is intentionally small and resource-based.

Authentication routes:

* `POST /api/auth/request-code`
* `POST /api/auth/verify-code`
* `GET /api/auth/me`
* `POST /api/auth/logout`

Catalog routes:

* `GET /api/categories`
* `GET /api/products`

Catalog routes are protected with a shared `requireAuth` helper. If the user does not have a valid session, the API returns `401`.

Zod is used to validate request bodies and query parameters.

The catalog APIs use offset pagination because it is simple and enough for this assignment. The default page size is 20, and the maximum page size is capped to avoid very large responses.

Product filters are applied in PostgreSQL. Prices are returned as strings to avoid decimal precision issues in JSON.

For a much larger or frequently changing catalog, I would consider cursor-based pagination instead.

## Testing

I added focused Vitest tests for the parts that are easiest and most valuable to test without a full database setup.

The tests cover:

* category path normalization
* category hierarchy helpers
* product normalization
* invalid product values
* auth validation
* hashing helpers
* expiration logic

I did not add full database integration tests or browser end-to-end tests because they would require more setup than I think is reasonable for the timeframe. The next useful testing step would be to run tests against a disposable PostgreSQL database in CI.

## Known Shortcuts

Some parts are intentionally simple because this is a limited-time assignment:

* Email delivery is mocked by logging codes to the console.
* The importer is manually triggered.
* Concurrent imports are not locked.
* Network retries are not implemented.
* Detailed invalid-row diagnostics are not stored permanently.
* Authentication does not have rate limiting or attempt lockout.
* The UI is simple and functional, without a full design system.
* Tests focus on pure logic and do not cover the full HTTP flow.
* Docker is used for PostgreSQL in local development, while the Nuxt app runs locally with pnpm.

The demo user is created through a database migration to satisfy the assignment requirement. The seed script can still be kept as an idempotent convenience for local development.

## Production Improvements

If I had more time, the main improvements I would make are:

* Send login codes through a real email provider.
* Add rate limiting for login-code requests and verification attempts.
* Add a lock so only one import can run at a time.
* Move imports to a background job.
* Add retry handling for feed downloads.
* Store more detailed import statistics.
* Add structured logging and monitoring.
* Add PostgreSQL integration tests.
* Add end-to-end tests for login, catalog pages, filters, and logout.
* Add CI checks for tests, build, migrations, and formatting.
* Consider PostgreSQL `COPY` or a more optimized staging strategy for much larger feeds.
