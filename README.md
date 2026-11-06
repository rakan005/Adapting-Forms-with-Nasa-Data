# Crop Advisor Backend

Java 21 / Spring Boot backend for the Adapting Forms with NASA Data project. The current climate provider and crop pack are demo fixtures; their values are not NASA observations or validated farming advice. The NASA provider stays pending until the project receives and reviews the actual dataset.

## Current capabilities

- Farm create, read, update, list, and delete; decision history and farmer action tracking.
- Crop advice rules for sowing windows, irrigation access, measured soil salinity, regional salinity caution, rainfall deficit and water demand, heat limits, and cereal-to-legume nitrogen restoration.
- Confidence and geographic coverage levels; unranked advice is returned for broader coverage. Fallow is surfaced when no crop passes the safety rules.
- Daily temperature degree-day calculation when validated daily observations and crop thresholds are available in a pack.
- AI chat endpoint with optional current farm and latest advice context; structured data organizer extracts a proposed farm update from natural language and normalizes crop choices against the active pack. Organizer results are drafts and are not saved automatically.
- Regional salinity reference endpoint based on a 2016 UNDP GeoHub categorical map. Categories are not converted into dS/m. Users can provide a lab measurement or override the regional category.
- H2 database, Flyway migrations, request validation, API errors, Actuator health, and Swagger UI.

## Requirements and run

- JDK 21 (a JRE alone is not enough to compile).
- Apache Maven 3.9+.

```bash
mvn test
mvn spring-boot:run
```

The service listens on `http://localhost:8080`.

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Health: `http://localhost:8080/actuator/health`
- H2 console: `http://localhost:8080/h2-console` (default JDBC URL: `jdbc:h2:file:./data/advisor`, user `sa`, blank password)

The chat and organizer endpoints use Gemini via Google AI Studio. Without a Gemini API key, the service still starts normally and these endpoints return `503 AI_NOT_CONFIGURED`.

```bash
export GEMINI_API_KEY="your-key"
# Optional: GEMINI_MODEL=gemini-2.5-flash
mvn spring-boot:run
```

## API quick start

Create a farm:

```http
POST /api/v1/farms
Content-Type: application/json

{
  "name": "Demo farm",
  "latitude": 31.95,
  "longitude": 35.91,
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
