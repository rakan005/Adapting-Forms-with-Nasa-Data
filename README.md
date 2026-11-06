# Crop Advisor Backend

Java 21 / Spring Boot backend for the Adapting Forms with NASA Data project. The current climate provider and crop pack are demo fixtures; their values are not NASA observations or validated farming advice. The NASA provider stays pending until the project receives and reviews the actual dataset.

## Current capabilities

- Farmer registration and passwordless sign-in with expiring, single-use email codes, hashed code storage, expiring bearer sessions, and account-scoped farm/decision access.
- Multiple farms per farmer, with free/paid monthly plan definitions and server-side limits.
- Subscription records; free plan is active, while paid selections stay `PENDING_PAYMENT` until a payment provider is connected. Prices are intentionally unset.
- Per-farm planting-season history, in-app climate threshold notices, alert preferences, and a printable report endpoint.
- Farm create, read, update, list, and delete; decision history and farmer action tracking.
- Crop advice rules for sowing windows, irrigation access, measured soil salinity, regional salinity caution, rainfall deficit and water demand, heat limits, and cereal-to-legume nitrogen restoration.
- Confidence and geographic coverage levels; unranked advice is returned for broader coverage. Fallow is surfaced when no crop passes the safety rules.
- Daily temperature degree-day calculation when validated daily observations and crop thresholds are available in a pack.
- AI chat endpoint with optional current farm and latest advice context; structured data organizer extracts a proposed farm update from natural language and normalizes crop choices against the active pack. Organizer results are drafts and are not saved automatically.
- Regional salinity reference endpoint based on a 2016 UNDP GeoHub categorical map. Categories are not converted into dS/m. Users can provide a lab measurement or override the regional category.
- H2 for local development or managed PostgreSQL in hosting, Flyway migrations, request validation, API errors, Actuator health, and Swagger UI.

## Requirements and run

- JDK 21 (a JRE alone is not enough to compile).
- Apache Maven 3.9+.

```bash
mvn -DskipTests package
mvn spring-boot:run
```

The service listens on `http://localhost:8080`.

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Health: `http://localhost:8080/actuator/health`
- H2 console: `http://localhost:8080/h2-console` (disabled by default; set `H2_CONSOLE_ENABLED=true` locally to enable it).

The chat and organizer endpoints use Gemini via Google AI Studio. Without a Gemini API key, the service still starts normally and these endpoints return `503 AI_NOT_CONFIGURED`.

```bash
export GEMINI_API_KEY="your-key"
# Optional: GEMINI_MODEL=gemini-3.5-flash-lite
mvn spring-boot:run
```

## API quick start

Create a farm (area is required and uses Jordanian dunums, where 1 dunum = 1,000 m²):

```http
POST /api/v1/farms
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Demo farm",
  "latitude": 31.95,
  "longitude": 35.91,
  "areaDunum": 12.5,
  "irrigation": "LIMITED",
  "previousCropCode": "WHEAT"
}
```

Request Arabic advice (replace `1` with the returned farm id):

```http
POST /api/v1/farms/1/advice?lang=ar
```

Optionally restrict evaluation to crops supported by the pack:

```http
POST /api/v1/farms/1/advice?lang=ar&crops=WHEAT&crops=LENTIL
```

Salinity assessment by location:

```http
GET /api/v1/reference/salinity?lat=31.95&lon=35.91
```

AI chat and data organization:

```http
POST /api/v1/assistant/chat
Content-Type: application/json

{"message":"اشرح لي التوصية"}
```

```http
POST /api/v1/assistant/organize
Content-Type: application/json

{"text":"المزرعة في السلط، مروي بالتنقيط، زرعت قمح الموسم الماضي"}
```

The organizer returns suggested structured fields for user review; it never writes them into the farm record implicitly.

## Farmer accounts and plans

Create an account by requesting a one-time email code, then verify it. Login uses the same email-code flow; there is no password field or password endpoint.

```http
POST /api/v1/auth/register/request-code
Content-Type: application/json

{"fullName":"Farmer Name","email":"farmer@example.com","phone":"+962..."}
```

```http
POST /api/v1/auth/register/verify-code
Content-Type: application/json

{"email":"farmer@example.com","code":"123456"}
```

Login uses `POST /api/v1/auth/login/request-code` with `{"email":"farmer@example.com"}`, followed by `POST /api/v1/auth/login/verify-code` with the email and six-digit code. Codes expire after ten minutes, are single-use and stored as HMAC hashes. Requests are throttled by email. The login request gives a generic response to avoid revealing whether an address has an account. Verification returns an `accessToken`; send it as `Authorization: Bearer <accessToken>`. Sessions expire after seven days. Use `POST /api/v1/auth/logout` to revoke the current session.
`GET /api/v1/subscriptions/plans` lists the monthly plans. `GET /api/v1/subscriptions/me` shows the selected and effective plans. `PUT /api/v1/subscriptions/me` selects a plan. Until checkout and a payment provider are configured, paid plans remain pending and the farmer keeps free-plan entitlements. Prices are not set in this prototype.

Season records are available at `GET/POST /api/v1/farms/{farmId}/seasons`; delete a record with `DELETE /api/v1/farms/{farmId}/seasons/{seasonId}`. Reports are JSON snapshots at `/api/v1/farms/{farmId}/decisions/{decisionId}/report`; the frontend formats them for printing or saving as PDF. Alert preferences use `GET/PUT /api/v1/alerts/preferences`; alerts appear at `GET /api/v1/alerts`.

The initial plan limits are implementation defaults, not approved commercial prices or final business policy: Basis has one farm and displays the latest 10 recommendations; Grower has three farms; Professional has 20. Review these limits with the team before launch. Alert evaluation currently runs when a new recommendation is requested; it is not a background job, SMS, or emergency warning. Demo climate alerts remain labeled with their demo data source. Farms created before account support remain unassigned; they are not exposed to newly registered accounts.

## Deploying the Java API

The backend can be deployed by a Docker-compatible Java hosting provider using the included `Dockerfile`. Configure these environment variables in the provider's private service settings:

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | The AI Studio key; keep it only in the backend provider's secret settings. |
| `ADVISOR_CORS_ALLOWED_ORIGINS` | The exact public frontend origin, for example `https://crop-advisor-team-demo.boxyfoam2.chatgpt.site`. The API permits the `Authorization` header for bearer sessions. |
| `PORT` | Usually supplied by the hosting provider; the application defaults to `8080` locally. |
| `SPRING_DATASOURCE_URL` | Managed PostgreSQL URL, for example `jdbc:postgresql://HOST:5432/DATABASE?sslmode=require`. |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | Credentials for the managed database. Flyway creates/updates tables at startup. |
| `SPRING_PROFILES_ACTIVE` | Set to `postgresql` so Flyway uses the PostgreSQL schema migrations. |
| `SPRING_MAIL_HOST` / `SPRING_MAIL_PORT` / `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD` | SMTP provider credentials used to send registration and login codes. Enable SMTP auth and STARTTLS at the provider. |
| `MAIL_FROM` | Verified sender address for the SMTP provider. |
| `OTP_HASH_SECRET` | Long random secret used to hash verification codes. Set a unique production value and keep it private. |
| `EMAIL_DELIVERY_MODE` | Keep `smtp` in hosted production. `console` logs codes and is only for local development. |

After deployment, check `/actuator/health`. The separate hosted frontend is configured to call the API's HTTPS origin. If that origin changes, update its `crop-advisor-api-base` meta tag and publish the frontend. The browser calls the API directly, so CORS must allow the exact frontend origin. Do not put the Gemini key in HTML or frontend environment variables.

The default H2 file database is for local development. Set the PostgreSQL variables above on the hosted service and attach persistent managed PostgreSQL before relying on farm records. The PostgreSQL profile uses its own Flyway migration set; keep `SPRING_PROFILES_ACTIVE=postgresql` when switching the service to PostgreSQL. A live database must still be provisioned in the hosting dashboard. SMTP must also be configured before real users can receive codes.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/farms?page=0&size=20` | List farms |
| GET / PUT / DELETE | `/api/v1/farms/{id}` | Read, replace, or erase a farm |
| POST | `/api/v1/farms/{id}/advice` | Generate and save advice |
| GET | `/api/v1/farms/{id}/decisions` | Decision history |
| GET / PATCH | `/api/v1/decisions/{id}` | Read a decision / record farmer action |
| GET | `/api/v1/reference/packs` | List knowledge packs |
| GET | `/api/v1/reference/crops` | List crops |
| GET | `/api/v1/reference/coverage?lat=31.95&lon=35.91` | Check crop pack coverage |
| GET | `/api/v1/reference/salinity?lat=31.95&lon=35.91` | Estimate regional salinity class |
| POST | `/api/v1/assistant/chat` | Ask the AI using optional farm/advice context |
| POST | `/api/v1/assistant/organize` | Convert free text to a reviewable farm-data draft |
| POST | `/api/v1/auth/register/request-code` / `verify-code` | Verify email and create an account |
| POST | `/api/v1/auth/login/request-code` / `verify-code` | Passwordless email-code sign-in |

## Salinity data limits

The built-in regional reference contains raster classes rather than laboratory measurements and has coarse published resolution. It is shown as regional context only. Advice warns when the farm has no measured salinity and never treats a map class as a numeric soil conductivity measurement. Enter lab salinity in dS/m when available; the user can also override the categorical map result.

## NASA data integration

The `ClimateProvider` interface remains the integration boundary. Replace the demonstration fixture with a provider that reads the NASA dataset after the team supplies it, then confirm coordinates, variables, units, date window, and missing-value rules. Until then, fixture values are clearly marked in advice and force low confidence.

## Project structure

```text
src/main/java/jo/orbitfarm/advisor/
  advice/      advice orchestration and rule evaluation
  assistant/   chat and structured farm-data organizer
  climate/     provider interface, demo fixture, and GDD calculator
  decision/    decision history and farmer actions
  farm/        farm entity, persistence, and API
  pack/        JSON pack model, validation, catalog, and reference API
  salinity/    categorical regional map lookup and assessment
src/main/resources/
  db/migration/  Flyway schema
  packs/         illustrative crop pack
  salinity/      attributed regional salinity raster
```
