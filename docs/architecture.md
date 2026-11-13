# Field Shift MVP — Implementation diagrams (Node.js / TypeScript, updated)

The original `field_shift_diagrams.md` models Spring Boot. These diagrams describe the **new independent Field Shift MVP** only. The existing Spring Boot/React application remains separate; no assertion of full-stack migration is made. This design follows the six-diagram structure from the uploaded reference.

## 1. Class / domain diagram

```mermaid
classDiagram
  class EvaluationAPI {
    +POST_evaluate(EvaluationRequest) EvaluationResponse
    +GET_config() Catalog
  }
  class SourceProvider {
    +loadPower(lat,lon) ClimateDay[]
    +optionalNdvi(lat,lon) NdviDay[]
    +optionalSoil(lat,lon) SoilProfile
  }
  class FeatureEngine {
    +deriveFeatures(days,lat,ndvi,scenario) Features
  }
  class McdaEngine {
    +validateWeights(weights) Weights
    +effectiveWeights(weights,features,soil) Weights
    +evaluate(crops,strategies,weights,features,soil) StrategyResult[]
  }
  class MonteCarloSimulator {
    +run(650,seed=2026) QuantileResults
  }
  class Crop {
    +crop string
    +group string
    +water_demand number
    +organic_matter number
    +market_flex number
    +source string
  }
  class Strategy {
    +id string
    +seasons string[]
    +isBaseline boolean
    +why string
  }
  class EvaluationRequest {
    +lat number
    +lon number
    +areaDunum number
    +waterSource string
    +currentRotation string[]
    +weights Weights
    +scenario Scenario
    +mode live|demo
  }
  class Features {
    +aridity number
    +heat_index number
    +bare_share number|null
    +data_quality number
    +monthly MonthlyRow[]
  }
  class StrategyResult {
    +score_deterministic number
    +mean number
    +p5 number
    +p95 number
    +p_top number
    +confidence string
    +sourceTags string[]
  }
  EvaluationAPI --> SourceProvider
  EvaluationAPI --> FeatureEngine
  EvaluationAPI --> McdaEngine
  McdaEngine --> MonteCarloSimulator
  McdaEngine --> Crop
  Strategy o-- Crop
  EvaluationRequest --> Strategy
  FeatureEngine --> Features
  McdaEngine --> StrategyResult
```

## 2. Component diagram

```mermaid
flowchart LR
  subgraph EXT[External data providers]
    POWER[NASA POWER Daily API]
    MODIS[NASA MODIS ORNL API]
    SOIL[ISRIC SoilGrids]
    ERA[ERA5-Land comparison]
  end
  subgraph PREP[Optional Python tools]
    F1[power_fetch.py]
    F2[modis_ndvi_fetch.py]
    F3[soilgrids_fetch.py]
    FE[features.py and validate_era5.py]
  end
  subgraph SERVER[Node.js 22 TypeScript API]
    API[HTTP /api/evaluate]
    SOURCES[Source loaders and cache]
    MOD[Feature extraction]
    CORE[MCDA plus Monte Carlo]
    STATIC[Static public UI]
  end
  subgraph DATA[Explicit provenance stores]
    CACHE[(Cache NASA POWER JSON)]
    CSV[(assets/crops.csv)]
    STR[(assets/strategies.example.json)]
    ND[(NDVI CSV + coordinate metadata)]
    SJ[(Soil JSON + coordinates)]
  end
  UI[Browser UI sliders timeline cards print PDF]
  POWER --> SOURCES --> CACHE
  MODIS --> F2 --> ND --> SOURCES
  SOIL --> F3 --> SJ --> SOURCES
  POWER --> F1 --> FE
  ERA --> FE
  CSV --> CORE
  STR --> CORE
  SOURCES --> MOD --> CORE --> API
  API <--> UI
  STATIC --> UI
```

## 3. Sequence diagram

```mermaid
sequenceDiagram
  autonumber
  actor Farmer
  participant UI as Browser UI
  participant API as Node evaluation API
  participant N as NASA POWER
  participant D as Optional NDVI / Soil
  participant E as Feature engine
  participant M as MCDA + Monte Carlo
  Farmer->>UI: Choose location, rotation and priorities
  UI->>API: POST /api/evaluate (mode=live)
  API->>N: NASA POWER daily point (or local valid cache)
  alt NASA POWER succeeds
    N-->>API: Actual daily climate and metadata
    API->>D: Load coordinate-matched optional datasets
    D-->>API: Data, or explicit unavailable flags
    API->>E: Climate days, optional NDVI, scenario
    E-->>API: Seasonal features and data-quality flags
    API->>M: 4 strategies, traits, weights, features, soil
    M-->>API: Score, mean, P5-P95, P(top), caveats
    API-->>UI: Provenance-tagged result
    UI-->>Farmer: Compare cards and field timeline
  else NASA POWER unavailable
    N--xAPI: Timeout, unavailable or malformed data
    API-->>UI: 503 DATA_UNAVAILABLE (never silent substitution)
  end
  opt Farmer deliberately chooses DEMO
    Farmer->>UI: Select synthetic demo
    UI->>API: POST /api/evaluate (mode=demo)
    API-->>UI: Explicit simulated results, confidence low
  end
```

## 4. Activity diagram

```mermaid
flowchart TD
  A([Start]) --> B[Enter farm location, area, water source, current rotation]
  B --> C[Set 5 priorities and optional hypothetical scenario]
  C --> D{Explicit synthetic demo?}
  D -- Yes --> E[Synthetic data, prominently labelled]
  D -- No --> F[Fetch real NASA POWER or read validated cache]
  F --> G{Sufficient historical climate data?}
  G -- No --> H[503 DATA_UNAVAILABLE; no invented weather]
  G -- Yes --> I[Load coordinate-matched NDVI and SoilGrids if available]
  E --> J[Derive seasonal features]
  I --> J
  J --> K[Generate baseline from farmer + 3 alternatives]
  K --> L[MCDA weights with climate and soil assumptions]
  L --> M[Seeded Monte Carlo sensitivity]
  M --> N[Source tags, confidence, risks, gaps]
  N --> O[Render timeline and strategies]
  O --> P{Farmer changes priority?}
  P -- Yes --> C
  P -- No --> Q([End])
```

## 5. Use case diagram

```mermaid
flowchart LR
  FARMER[Farmer / judge]
  EXPERT[Local agronomist]
  ADMIN[Developer / data maintainer]
  SYSTEM[Field Shift MVP]
  U1([Enter location and current rotation])
  U2([Set personal priorities])
  U3([Compare baseline and alternatives])
  U4([Inspect uncertainty and data gaps])
  U5([View monthly historical timeline])
  U6([Run hypothetical rain / temperature stress test])
  U7([Print report to PDF])
  U8([Review crops and thresholds])
  U9([Validate NASA / satellite / soil sources])
  FARMER --- U1
  FARMER --- U2
  FARMER --- U3
  FARMER --- U4
  FARMER --- U5
  FARMER --- U6
  FARMER --- U7
  EXPERT --- U8
  ADMIN --- U9
  U3 -. includes .-> U4
  U3 -. includes .-> U5
  U6 -. extends .-> U3
```

## 6. Logical entity relationship diagram

The standalone MVP uses JSON/CSV and a file cache, **not PostgreSQL**. This is a conceptual model, not a deployed database schema.

```mermaid
erDiagram
  FARM_PROFILE ||--o{ EVALUATION_RUN : requests
  FARM_PROFILE ||--|{ ROTATION_SEASON : contains
  STRATEGY ||--|{ ROTATION_SEASON : contains
  CROP ||--o{ ROTATION_SEASON : selected
  EVALUATION_RUN ||--|{ STRATEGY_RESULT : produces
  STRATEGY ||--o{ STRATEGY_RESULT : is_evaluated
  EVALUATION_RUN ||--|{ WEIGHT : uses
  CLIMATE_FEATURES ||--o{ EVALUATION_RUN : informs
  DATA_SOURCE ||--o{ CLIMATE_FEATURES : documents
  DATA_SOURCE ||--o{ SOIL_PROPERTY : documents
  EVALUATION_RUN ||--o{ SOIL_PROPERTY : considers
  FARM_PROFILE {
    number lat
    number lon
    number areaDunum
    string waterSource
  }
  CROP {
    string crop PK
    string group
    number water_demand
    number n_fixing
    string source
  }
  ROTATION_SEASON {
    string strategy_id
    number index
    string crop_id
  }
  STRATEGY {
    string id PK
    string name
    boolean isBaseline
  }
  EVALUATION_RUN {
    string mode
    number rainPct
    number tempDeltaC
    datetime generatedAt
  }
  STRATEGY_RESULT {
    string strategyId
    number score
    number p5
    number p95
    number pTop
    string confidence
  }
  WEIGHT {
    string criterion
    number value
  }
  CLIMATE_FEATURES {
    number aridity
    number heatIndex
    number bareShare
    number dataQuality
  }
  SOIL_PROPERTY {
    string property
    string depth
    number value
  }
  DATA_SOURCE {
    string id PK
    string sourceKind
    string retrievedAt
    string resolution
    string limitations
  }
```

## Technical caveats

The engine does not persist evaluation history or user accounts. All output is a transient HTTP response; browser print provides PDF export. Original Spring Boot decision history remains untouched. Reusing the old `src/main/java` entities here would misleadingly imply a migration that was not performed.
