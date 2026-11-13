# Field Shift – Mermaid Diagrams

Six diagrams for the Field Shift crop-rotation decision-support tool (NASA Space Apps 2026).
Architecture follows the action plan: Python fetch scripts (run once) -> CSV/JSON files -> Spring Boot engine (MCDA + Monte Carlo) -> HTML/JS (Chart.js) UI.

---

## 1. Class Diagram

Logical classes of the Java (Spring Boot) engine and its data model.

```mermaid
classDiagram
    direction LR

    class EvaluateController {
        +evaluate(EvaluationRequest) EvaluationResponse
        +getStrategies() List~Strategy~
        +getFeatures() Features
        +getSources() List~DataSource~
    }

    class DataRepository {
        -String dataDir
        +loadCrops() Map~String, Crop~
        +loadStrategies() List~Strategy~
        +loadFeatures() Features
        +loadSoil() SoilProfile
        +loadSources() List~DataSource~
    }

    class EvaluationService {
        +evaluate(EvaluationRequest) EvaluationResponse
        -buildConfidence(width, dataQuality) Confidence
    }

    class McdaEngine {
        +cropCriteria(Crop) Map~String, Double~
        +strategyScores(Strategy, Map crops) double[]
        +effectiveWeights(Weights, aridity, heatIndex) double[]
        +score(Strategy, Weights, Features) double
    }

    class MonteCarloSimulator {
        -int n
        -long seed
        -double cropNoise
        -double concentration
        +run(List~Strategy~, Weights, Features) List~StrategyResult~
        -sampleWeights(Weights) double[]
        -perturbFeatures(Features) Features
    }

    class Crop {
        +String cropId
        +String group
        +double kcMid
        +boolean nFixing
        +int rootDepth
        +int waterDemand
        +int droughtTol
        +int frostTol
        +int erosionCover
        +int organicMatter
        +int forageValue
        +int marketFlex
        +int pestBreak
        +String source
    }

    class Strategy {
        +String id
        +String name
        +List~String~ seasons
        +String why
        +List~String~ evidence
        +List~String~ benefits
        +List~String~ informationGaps
        +List~String~ localReviewRisks
        +boolean isBaseline
    }

    class Features {
        +double aridity
        +double heatIndex
        +double rainCv
        +double frostDays
        +double stormDays
        +int longestDrySpell
        +double bareShare
        +double dataQuality
    }

    class SoilProfile {
        +double clay
        +double sand
        +double silt
        +double soc
        +double phh2o
        +String source
    }

    class Weights {
        +double waterSaving
        +double soilBuilding
        +double erosionControl
        +double income
        +double heatRisk
        +normalize() Weights
    }

    class EvaluationRequest {
        +double lat
        +double lon
        +String currentRotation
        +Weights weights
        +double rainScenarioPct
        +double tempScenarioC
    }

    class EvaluationResponse {
        +List~StrategyResult~ strategies
        +double rankingStabilityTop1
        +double dataQuality
        +String disclaimer
        +String caveat
    }

    class StrategyResult {
        +String strategyId
        +double scoreDeterministic
        +double mean
        +double p5
        +double p95
        +double pTop
        +Confidence confidence
        +Map criteria
        +List~SourceTag~ tags
    }

    class DataSource {
        +String name
        +String version
        +String dateRetrieved
        +String resolution
        +String limits
        +SourceTag tag
    }

    class Confidence {
        <<enumeration>>
        HIGH
        MEDIUM
        LOW
    }

    class SourceTag {
        <<enumeration>>
        SATELLITE_OBSERVED
        MODEL_INFERRED
        EXPERT_ASSUMED
    }

    EvaluateController --> EvaluationService : calls
    EvaluationService --> DataRepository : reads data
    EvaluationService --> McdaEngine : deterministic score
    EvaluationService --> MonteCarloSimulator : uncertainty
    MonteCarloSimulator --> McdaEngine : reuses
    DataRepository ..> Crop : loads
    DataRepository ..> Strategy : loads
    DataRepository ..> Features : loads
    DataRepository ..> SoilProfile : loads
    DataRepository ..> DataSource : loads
    McdaEngine ..> Crop : uses
    McdaEngine ..> Weights : uses
    McdaEngine ..> Features : uses
    Strategy "1" o-- "1..*" Crop : seasons reference
    EvaluationRequest *-- Weights
    EvaluationResponse *-- "3..*" StrategyResult
    StrategyResult --> Confidence
    StrategyResult --> SourceTag
    DataSource --> SourceTag
```

---

## 2. Component Diagram

Mermaid has no native UML component diagram, so a flowchart with subgraphs is used.

```mermaid
flowchart LR
    subgraph EXT["External data services"]
        POWER["NASA POWER API<br/>(daily climate)"]
        MODIS["ORNL DAAC MODIS API<br/>(MOD13Q1 NDVI)"]
        SOIL["ISRIC SoilGrids API<br/>(modelled soil)"]
        ERA5["Open-Meteo ERA5<br/>(validation)"]
    end

    subgraph TOOLS["Offline data tools (Python, run once)"]
        PF["power_fetch.py"]
        MF["modis_ndvi_fetch.py"]
        SF["soilgrids_fetch.py"]
        FE["features.py"]
        VAL["Validation analysis<br/>(POWER vs ERA5: bias, RMSE)"]
        PYM["mcda.py<br/>(reference engine)"]
    end

    subgraph FILES["Data files (CSV / JSON)"]
        CSV[("crops.csv")]
        STR[("strategies.json")]
        FEA[("features.json")]
        SOJ[("soil.json")]
        SRC[("data-sources registry")]
        RES[("results.json<br/>fallback snapshot")]
    end

    subgraph BACKEND["Spring Boot application (Java)"]
        API["REST API<br/>POST /api/evaluate"]
        REPO["Data repository<br/>(CSV/JSON reader)"]
        MCDA["MCDA engine"]
        MC["Monte Carlo simulator"]
        STATIC["Static resource server"]
    end

    subgraph FRONT["Front-end (HTML + JavaScript)"]
        UI["Inputs and priority sliders"]
        CARDS["Strategy cards<br/>P5-P95, confidence, source tags"]
        TL["Field timeline<br/>NDVI, bare ground, stress seasons"]
        FB["Snapshot fallback engine<br/>(JS MCDA)"]
        CH["Chart.js"]
    end

    HOST["Public host<br/>Render / Railway (Docker)"]

    POWER --> PF
    MODIS --> MF
    SOIL --> SF
    ERA5 --> VAL
    PF --> FE
    MF --> FE
    PF --> VAL
    SF --> SOJ
    FE --> FEA
    PYM -. "cross-check results" .-> MCDA
    PYM --> RES

    CSV --> REPO
    STR --> REPO
    FEA --> REPO
    SOJ --> REPO
    SRC --> REPO
    REPO --> MCDA
    MCDA --> MC
    MC --> API
    MCDA --> API
    STATIC --> UI

    UI -- "JSON request" --> API
    API -- "JSON response" --> CARDS
    CARDS --> CH
    TL --> CH
    RES -. "if API is down" .-> FB
    FB -.-> CARDS

    BACKEND --> HOST
```

---

## 3. Sequence Diagram

Main scenario: the farmer moves a priority slider and the ranking updates (the live demo moment). Includes the API-down fallback.

```mermaid
sequenceDiagram
    autonumber
    actor Farmer
    participant UI as Web UI (HTML/JS)
    participant API as EvaluateController
    participant SVC as EvaluationService
    participant REPO as DataRepository
    participant ENG as McdaEngine
    participant MC as MonteCarloSimulator
    participant SNAP as Snapshot (results.json)

    Farmer->>UI: Open page, enter location and current rotation
    UI->>API: GET /api/strategies and /api/features
    API->>REPO: load strategies and features
    REPO-->>API: strategies.json, features.json
    API-->>UI: strategies, climate features, source registry
    UI-->>Farmer: Show field timeline and data-source badges

    Farmer->>UI: Move priority slider (e.g. water saving up)
    UI->>API: POST /api/evaluate (weights, scenario)

    alt API available
        API->>SVC: evaluate(request)
        SVC->>REPO: loadCrops(), loadFeatures()
        REPO-->>SVC: crops.csv rows, features
        SVC->>ENG: effectiveWeights(weights, aridity, heatIndex)
        ENG-->>SVC: climate-adjusted weights
        SVC->>ENG: deterministic score per strategy
        ENG-->>SVC: scores and criterion breakdown
        SVC->>MC: run(n simulations)
        loop N samples
            MC->>MC: perturb crop scores, weights, features
            MC->>ENG: score(strategy)
            ENG-->>MC: sampled score
        end
        MC-->>SVC: mean, P5-P95, P(top)
        SVC->>SVC: derive confidence from width and data quality
        SVC-->>API: EvaluationResponse
        API-->>UI: ranked strategies as JSON
    else API down or timeout
        UI->>SNAP: load stored results for nearest weight profile
        SNAP-->>UI: stored ranking
        UI-->>Farmer: Show results with label "Stored snapshot"
    end

    UI-->>Farmer: Re-ordered cards with P5-P95 bars, confidence badge, source tags
    UI-->>Farmer: Fixed disclaimer: tool supports, not replaces, the local advisor
```

---

## 4. Activity Diagram

End-to-end workflow, from data fetching to the decision shown to the farmer. Includes the Friday 9 PM decision point.

```mermaid
flowchart TD
    START((Start)) --> A1

    subgraph PREP["Data preparation (Haneen, Rakan)"]
        A1["Choose region and farmer story<br/>(default: near Amman 31.9, 35.9)"]
        A2["Fetch NASA POWER daily data"]
        A3["Fetch MODIS NDVI"]
        A4["Fetch SoilGrids soil properties"]
        A5{"All fetches<br/>succeeded?"}
        A6["Keep POWER only<br/>(MODIS optional)"]
        A7["Run features.py<br/>aridity, heat_index, bare_share"]
        A8{"Sanity checks pass?<br/>no NaN, units, valid NDVI share"}
        A9["Fix errors and re-run"]
        A10["Compare POWER vs ERA5<br/>bias and RMSE"]
    end

    subgraph ENGINE["Engine (Abdulrahman)"]
        B1["Load crops.csv and strategies.json"]
        B2["Compute crop criteria scores"]
        B3["Adjust weights by aridity and heat_index"]
        B4["Run Monte Carlo simulation"]
        B5{"9 PM: Java matches<br/>Python within tolerance?"}
        B6["Fallback: results.json from Python<br/>+ JS engine in browser"]
        B7["Derive P5-P95, P(top), confidence"]
    end

    subgraph UIFLOW["Front-end (Mohammed)"]
        C1["Farmer enters priorities with sliders"]
        C2["Call POST /api/evaluate"]
        C3{"API reachable?"}
        C4["Load stored snapshot<br/>and show label"]
        C5["Render strategy cards, timeline,<br/>source tags, disclaimer"]
        C6{"Farmer changes<br/>priorities?"}
    end

    A1 --> A2 --> A3 --> A4 --> A5
    A5 -- "No" --> A6 --> A7
    A5 -- "Yes" --> A7
    A7 --> A8
    A8 -- "No" --> A9 --> A7
    A8 -- "Yes" --> A10 --> B1

    B1 --> B2 --> B3 --> B4 --> B5
    B5 -- "No" --> B6 --> B7
    B5 -- "Yes" --> B7
    B7 --> C1

    C1 --> C2 --> C3
    C3 -- "No" --> C4 --> C5
    C3 -- "Yes" --> C5
    C5 --> C6
    C6 -- "Yes" --> C1
    C6 -- "No" --> END((End))
```

---

## 5. Use Case Diagram

Mermaid has no native use case notation, so actors and use cases are drawn with a flowchart.

```mermaid
flowchart LR
    Farmer(["Farmer"])
    Advisor(["Local agronomist / advisor"])
    Admin(["Team member / data maintainer"])
    NASA(["NASA and partner data services"])

    subgraph SYS["Field Shift decision-support system"]
        UC1(["Enter location and current rotation"])
        UC2(["Set priorities with sliders"])
        UC3(["View field timeline<br/>(NDVI, bare ground, stress seasons)"])
        UC4(["Compare 3+ rotation strategies"])
        UC5(["View uncertainty<br/>(P5-P95 and confidence)"])
        UC6(["See source tags<br/>(observed / model / assumed)"])
        UC7(["Read why, evidence, benefits,<br/>gaps and risks"])
        UC8(["Run rainfall / temperature scenario"])
        UC9(["Read disclaimer and tooltips"])
        UC10(["Export summary report"])
        UC11(["Evaluate strategies<br/>(MCDA + Monte Carlo)"])
        UC12(["Use stored snapshot offline"])
        UC13(["Update crops and strategies"])
        UC14(["Fetch and validate NASA data"])
        UC15(["Add a new region by coordinates"])
        UC16(["Review local-judgement risks"])
    end

    Farmer --- UC1
    Farmer --- UC2
    Farmer --- UC3
    Farmer --- UC4
    Farmer --- UC8
    Farmer --- UC10

    Advisor --- UC16
    Advisor --- UC13
    Advisor --- UC7

    Admin --- UC13
    Admin --- UC14
    Admin --- UC15

    NASA --- UC14

    UC2 -. "include" .-> UC11
    UC4 -. "include" .-> UC11
    UC4 -. "include" .-> UC5
    UC4 -. "include" .-> UC6
    UC4 -. "include" .-> UC7
    UC4 -. "include" .-> UC9
    UC8 -. "extend" .-> UC4
    UC12 -. "extend" .-> UC4
    UC15 -. "include" .-> UC14
    UC16 -. "extend" .-> UC7
```

---

## 6. Entity-Relationship Diagram (ERD)

Logical data model. The project uses CSV/JSON files instead of a database, so each entity maps to a file or a JSON structure (for example CROP = crops.csv, STRATEGY = strategies.json).

```mermaid
erDiagram
    REGION ||--o{ CLIMATE_FEATURES : "has"
    REGION ||--o{ SOIL_PROPERTY : "has"
    REGION ||--o{ FARM_PROFILE : "located in"
    REGION ||--o{ EVALUATION_RUN : "evaluated for"

    FARM_PROFILE ||--o{ EVALUATION_RUN : "requests"
    FARM_PROFILE }o--|| STRATEGY : "current rotation is"

    STRATEGY ||--|{ STRATEGY_SEASON : "consists of"
    CROP ||--o{ STRATEGY_SEASON : "planted in"
    STRATEGY ||--o{ STRATEGY_NOTE : "documented by"

    EVALUATION_RUN ||--|{ WEIGHT : "uses"
    EVALUATION_RUN ||--|{ STRATEGY_RESULT : "produces"
    STRATEGY ||--o{ STRATEGY_RESULT : "scored as"
    STRATEGY_RESULT ||--|{ CRITERION_SCORE : "broken down into"

    DATA_SOURCE ||--o{ CLIMATE_FEATURES : "provides"
    DATA_SOURCE ||--o{ SOIL_PROPERTY : "provides"
    DATA_SOURCE ||--o{ CROP : "documents"

    REGION {
        string region_id PK
        string name
        float lat
        float lon
    }

    FARM_PROFILE {
        string farm_id PK
        string region_id FK
        string current_strategy_id FK
        string water_source
        string notes
    }

    CROP {
        string crop_id PK
        string crop_group
        float kc_mid
        int n_fixing
        int root_depth
        int water_demand
        int drought_tol
        int frost_tol
        int erosion_cover
        int organic_matter
        int forage_value
        int market_flex
        int pest_break
        string source_id FK
    }

    STRATEGY {
        string strategy_id PK
        string name
        boolean is_baseline
        string why
    }

    STRATEGY_SEASON {
        string strategy_id FK
        int season_order
        string crop_id FK
    }

    STRATEGY_NOTE {
        string note_id PK
        string strategy_id FK
        string note_type "evidence, benefit, gap, risk"
        string text
        string source_tag "observed, model, assumed"
    }

    CLIMATE_FEATURES {
        string feature_id PK
        string region_id FK
        float aridity
        float heat_index
        float rain_cv
        float frost_days
        float storm_days
        int longest_dry_spell
        float bare_share
        float data_quality
        string source_id FK
    }

    SOIL_PROPERTY {
        string soil_id PK
        string region_id FK
        string property_name
        string depth_range
        float value
        string source_id FK
    }

    DATA_SOURCE {
        string source_id PK
        string name
        string version
        date date_retrieved
        string resolution
        string limits
        string source_tag "observed, model, assumed"
    }

    WEIGHT {
        string run_id FK
        string criterion
        float value
    }

    EVALUATION_RUN {
        string run_id PK
        string farm_id FK
        string region_id FK
        datetime created_at
        float rain_scenario_pct
        float temp_scenario_c
        int n_simulations
        int seed
    }

    STRATEGY_RESULT {
        string result_id PK
        string run_id FK
        string strategy_id FK
        float score_deterministic
        float mean_score
        float p5
        float p95
        float p_top
        string confidence "high, medium, low"
    }

    CRITERION_SCORE {
        string result_id FK
        string criterion
        float value
    }
```

---

### Criteria names used in the diagrams
`water_saving`, `soil_building`, `erosion_control`, `income`, `heat_risk` (from `mcda.py`).

### How to render
Paste any block into https://mermaid.live, or view this file in VS Code (Markdown Preview Mermaid Support), GitHub, or Notion.
