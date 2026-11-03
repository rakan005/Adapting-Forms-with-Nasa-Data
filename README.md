# Crop Advisor Backend

Java 21 / Spring Boot backend prototype based on the supplied architecture diagrams. It currently runs with a fixed climate fixture and one illustrative Jordan crop pack. **The fixture values and crop thresholds are demonstration values only; they are not NASA observations or agronomic guidance.** Replace the pack and climate provider with reviewed project data before using the recommendations for real farms.

## Included in this first version

- Farm create, read, update, list, and delete endpoints.
- Advice generation, rule reasons, exclusions, warning flags, and a saved decision history.
- Recording a farmer action (`PLANTED`, `FALLOW`, `OTHER`).
- Pack, crop, and geographic coverage reference endpoints.
- H2 file database, Flyway schema migration, request validation, consistent API errors, and Swagger UI.
- Pluggable `ClimateProvider`; the current implementation is `FixtureClimateProvider`.

## Requirements

- JDK 21.
- Apache Maven 3.6.3 or newer, or import `pom.xml` in IntelliJ IDEA and run `CropAdvisorApplication`.

The current coding workspace has Java 17 and does not have Maven installed, so the project is configured for the requested Java 21 target but could not be launched here.

## Run

From this directory:

```bash
mvn spring-boot:run
```

The service listens on `http://localhost:8080`.

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Health: `http://localhost:8080/actuator/health`
- H2 console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:file:./data/advisor`, user `sa`, blank password)

## API quick start

Create a farm in Jordan:

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

Request advice (replace `1` with the returned farm id):

```http
POST /api/v1/farms/1/advice?lang=ar
```

Other endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/farms?page=0&size=20` | List farms |
| GET / PUT / DELETE | `/api/v1/farms/{id}` | Read, replace, or erase a farm |
| GET | `/api/v1/farms/{id}/decisions` | Decision history |
| GET | `/api/v1/decisions/{id}` | Read one decision |
| PATCH | `/api/v1/decisions/{id}` | Record farmer action |
| GET | `/api/v1/reference/packs` | List knowledge packs |
| GET | `/api/v1/reference/crops` | List crops |
| GET | `/api/v1/reference/coverage?lat=31.95&lon=35.91` | Check pack coverage |

Action body example:

```json
{ "action": "PLANTED", "cropCode": "WHEAT" }
```

## Project structure

```text
src/main/java/jo/orbitfarm/advisor/
  advice/      advice orchestration and response
  api/         shared errors
  climate/     climate provider abstraction and demo fixture
  decision/    decision history and farmer actions
  farm/        farm entity, persistence, service, and API
  pack/        JSON pack model, catalog, and reference API
src/main/resources/
  db/migration/  Flyway schema
  packs/         illustrative crop pack
```

## Next integration step

Keep the `ClimateProvider` interface and replace the fixture implementation with a NASA POWER provider once the team receives the approved variables, units, season window, and source data. Replace `jordan-demo.json` with reviewed pack data and confirm the thresholds with the team before treating the rules as final. The current `nasa` Spring profile is intentionally not implemented yet.
