package jo.orbitfarm.advisor.climate;

import java.math.BigDecimal;

public interface ClimateProvider {
    ClimateSnapshot getSnapshot(BigDecimal latitude, BigDecimal longitude);
    String source();
    record ClimateSnapshot(BigDecimal rainfallAnomalyPercent, BigDecimal maxTemperatureTrendC,
                           BigDecimal recentMaxTemperatureC, boolean stale, BigDecimal missingRatio) {}
}
