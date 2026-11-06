package jo.orbitfarm.advisor.advice;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import jo.orbitfarm.advisor.salinity.SalinityService;

public record AdviceResponse(Long decisionId, Long farmId, LocalDate decisionDate, String packCode, int coverageLevel,
                             boolean ranked, String confidence, String climateSource, Climate climate,
                             List<CropSuggestion> crops, List<Exclusion> exclusions, List<String> firedRules,
                             List<String> warnings, List<String> advisories, String explanation,
                             FarmerAction farmerAction, boolean simulated, SalinityService.Assessment salinityAssessment,
                             boolean fallowAdvised, String climateBand, boolean heatSpell) {
    public record Climate(BigDecimal rainfallAnomalyPercent, BigDecimal maxTemperatureTrendC,
                          BigDecimal recentMaxTemperatureC, boolean stale, BigDecimal missingRatio) {}
    public record CropSuggestion(String code, String nameEn, String nameAr, Integer rankNo,
                                 List<String> reasons, boolean needsConfirmation, BigDecimal gddToDate) {}
    public record Exclusion(String cropCode, String reason) {}
    public record FarmerAction(String action, String cropCode, java.time.Instant recordedAt) {}
    public AdviceResponse withDecisionId(Long id) {
        return new AdviceResponse(id, farmId, decisionDate, packCode, coverageLevel, ranked, confidence,
                climateSource, climate, crops, exclusions, firedRules, warnings, advisories, explanation, farmerAction, simulated,
                salinityAssessment, fallowAdvised, climateBand, heatSpell);
    }
    public AdviceResponse withFarmerAction(String action, String cropCode, java.time.Instant at) {
        return new AdviceResponse(decisionId, farmId, decisionDate, packCode, coverageLevel, ranked, confidence,
                climateSource, climate, crops, exclusions, firedRules, warnings, advisories, explanation,
                new FarmerAction(action, cropCode, at), simulated, salinityAssessment, fallowAdvised, climateBand, heatSpell);
    }
}
