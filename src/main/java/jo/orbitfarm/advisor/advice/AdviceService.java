package jo.orbitfarm.advisor.advice;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jo.orbitfarm.advisor.api.ApiException;
import jo.orbitfarm.advisor.climate.ClimateProvider;
import jo.orbitfarm.advisor.decision.DecisionRecordEntity;
import jo.orbitfarm.advisor.decision.DecisionRecordRepository;
import jo.orbitfarm.advisor.farm.FarmEntity;
import jo.orbitfarm.advisor.farm.FarmService;
import jo.orbitfarm.advisor.pack.CropPack;
import jo.orbitfarm.advisor.pack.PackCatalog;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
public class AdviceService {
    private final FarmService farms;
    private final PackCatalog packs;
    private final ClimateProvider climate;
    private final DecisionRecordRepository decisions;
    private final ObjectMapper mapper;

    public AdviceService(FarmService farms, PackCatalog packs, ClimateProvider climate,
                        DecisionRecordRepository decisions, ObjectMapper mapper) {
        this.farms = farms; this.packs = packs; this.climate = climate; this.decisions = decisions; this.mapper = mapper;
    }

    @Transactional
    public AdviceResponse advise(Long farmId, LocalDate asOf, String language) {
        FarmEntity farm = farms.require(farmId);
        LocalDate date = asOf == null ? LocalDate.now(ZoneId.of("Asia/Amman")) : asOf;
        String lang = language == null ? "en" : language.toLowerCase(Locale.ROOT);
        if (!Set.of("en", "ar").contains(lang)) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_LANGUAGE", "lang must be en or ar");
        Optional<CropPack> selected = packs.resolve(farm.getLatitude(), farm.getLongitude());
        ClimateProvider.ClimateSnapshot c = climate.getSnapshot(farm.getLatitude(), farm.getLongitude());
        List<AdviceResponse.CropSuggestion> recommendations = new ArrayList<>();
        List<AdviceResponse.Exclusion> exclusions = new ArrayList<>();
        List<String> rules = new ArrayList<>(), warnings = new ArrayList<>(), advisories = new ArrayList<>();
        int coverage = selected.map(p -> "LOCAL".equals(p.scope()) ? 2 : 1).orElse(0);
        boolean ranked = coverage == 2;
        String packCode = selected.map(CropPack::code).orElse(null);
        if (selected.isPresent()) {
            CropPack pack = selected.get();
            List<ScoredCrop> eligible = new ArrayList<>();
            for (CropPack.Crop crop : pack.crops()) {
                if (crop.sowingWindows() != null && !crop.sowingWindows().isEmpty()
                        && crop.sowingWindows().stream().noneMatch(w -> w.includes(date.getMonthValue()))) {
                    exclusions.add(new AdviceResponse.Exclusion(crop.code(), "OUTSIDE_SOWING_WINDOW"));
                    if (!rules.contains("SOWING_WINDOW")) rules.add("SOWING_WINDOW");
                    continue;
                }
                int score = 0;
                List<String> reasons = new ArrayList<>();
                boolean confirm = false;
                if ("NONE".equalsIgnoreCase(farm.getIrrigation()) && crop.requiresIrrigation()) {
                    exclusions.add(new AdviceResponse.Exclusion(crop.code(), "IRRIGATION_UNAVAILABLE"));
                    if (!rules.contains("IRRIGATION")) rules.add("IRRIGATION");
                    continue;
                }
                if (crop.requiresIrrigation() && ("LIMITED".equalsIgnoreCase(farm.getIrrigation()) || farm.getIrrigation() == null)) {
                    confirm = true; reasons.add("IRRIGATION");
                    if (!rules.contains("IRRIGATION")) rules.add("IRRIGATION");
                }
                if (farm.getSalinityDsm() != null && crop.salinityLimitDsm() != null
                        && farm.getSalinityDsm().compareTo(crop.salinityLimitDsm()) > 0) {
                    exclusions.add(new AdviceResponse.Exclusion(crop.code(), "SALINITY_LIMIT_EXCEEDED"));
                    if (!rules.contains("SALINITY")) rules.add("SALINITY");
                    continue;
                }
                if (farm.getSalinityDsm() == null && crop.salinityLimitDsm() != null && crop.salinityLimitDsm().compareTo(new BigDecimal("4.0")) < 0) {
                    confirm = true; reasons.add("CHECK_SALINITY");
                    if (!rules.contains("SALINITY")) rules.add("SALINITY");
                }
                BigDecimal rainDeficitLimit = BigDecimal.valueOf(-pack.thresholds().rainDeficitPercent());
                if (c.rainfallAnomalyPercent().compareTo(rainDeficitLimit) < 0 && "HIGH".equalsIgnoreCase(crop.waterDemand())) {
                    exclusions.add(new AdviceResponse.Exclusion(crop.code(), "HIGH_WATER_DEMAND_DURING_DRY_ANOMALY"));
                    advisories.add("REDUCE_SEED_DENSITY");
                    if (!rules.contains("WATER_CONSERVATION")) rules.add("WATER_CONSERVATION");
                    continue;
                }
                if (c.maxTemperatureTrendC().compareTo(BigDecimal.ZERO) > 0
                        && c.recentMaxTemperatureC().compareTo(BigDecimal.valueOf(crop.heatLimitC())) > 0) {
                    BigDecimal excess = c.recentMaxTemperatureC().subtract(BigDecimal.valueOf(crop.heatLimitC()));
                    if (excess.compareTo(pack.thresholds().heatMarginC()) > 0) {
                        exclusions.add(new AdviceResponse.Exclusion(crop.code(), "HEAT_LIMIT_EXCEEDED"));
                        if (!rules.contains("HEAT_STRESS")) rules.add("HEAT_STRESS");
                        continue;
                    }
                    confirm = true; reasons.add("CHANGE_VARIETY");
                    if (!rules.contains("HEAT_STRESS")) rules.add("HEAT_STRESS");
                }
                if (isPreviousCereal(farm.getPreviousCropCode()) && crop.legume()) {
                    score += pack.thresholds().nitrogenBoost().intValue();
                    reasons.add("NITROGEN_RESTORATION");
                    if (!rules.contains("NITROGEN_RESTORATION")) rules.add("NITROGEN_RESTORATION");
                }
                eligible.add(new ScoredCrop(crop, score, reasons, confirm));
            }
            if (ranked) eligible.sort(Comparator.comparingInt(ScoredCrop::score).reversed().thenComparing(x -> x.crop().code()));
            else eligible.sort(Comparator.comparing(x -> x.crop().code()));
            int rank = 1;
            for (ScoredCrop item : eligible) {
                CropPack.Crop crop = item.crop();
                recommendations.add(new AdviceResponse.CropSuggestion(crop.code(), "ar".equals(lang) ? crop.nameAr() : crop.nameEn(),
                        crop.nameAr(), ranked ? rank++ : null, item.reasons(), item.confirm()));
            }
        } else {
            warnings.add("NO_REVIEWED_PACK_COVERS_LOCATION");
        }
        warnings.add("DEMO_CLIMATE_DATA_NOT_FOR_REAL_FARM_DECISIONS");
        if (c.stale()) warnings.add("CLIMATE_DATA_STALE");
        if (c.missingRatio().compareTo(new BigDecimal("0.2")) > 0) warnings.add("CLIMATE_DATA_INCOMPLETE");
        String explanation = selected.isEmpty()
                ? "No reviewed crop pack covers this location. Only demonstration climate indicators are shown."
                : "Recommendations are generated by the demonstration rules and fixture climate provider. Verify them against reviewed local agronomy data before use.";
        AdviceResponse response = new AdviceResponse(null, farmId, date, packCode, coverage, ranked, "LOW",
                climate.source(), new AdviceResponse.Climate(c.rainfallAnomalyPercent(), c.maxTemperatureTrendC(),
                c.recentMaxTemperatureC(), c.stale(), c.missingRatio()), recommendations, exclusions,
                rules, warnings.stream().distinct().toList(), advisories.stream().distinct().toList(), explanation, null, false);
        DecisionRecordEntity record = decisions.save(new DecisionRecordEntity(farmId, date, packCode, coverage, ranked,
                response.confidence(), write(response)));
        response = response.withDecisionId(record.getId());
        record.setResponseJson(write(response));
        decisions.save(record);
        return response;
    }
    private String write(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Could not serialize advice response", e); }
    }
    private boolean isPreviousCereal(String code) { return "WHEAT".equalsIgnoreCase(code) || "BARLEY".equalsIgnoreCase(code); }
    private record ScoredCrop(CropPack.Crop crop, int score, List<String> reasons, boolean confirm) {}
}
