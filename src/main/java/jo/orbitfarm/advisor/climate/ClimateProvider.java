package jo.orbitfarm.advisor.climate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ClimateProvider {
    ClimateSnapshot getSnapshot(BigDecimal latitude, BigDecimal longitude);
    String source();
    record ClimateSnapshot(BigDecimal rainfallAnomalyPercent, BigDecimal maxTemperatureTrendC,
                           BigDecimal recentMaxTemperatureC, boolean stale, BigDecimal missingRatio,
                           List<DailyTemperature> dailyTemperatures) {}
    record DailyTemperature(LocalDate date, BigDecimal minC, BigDecimal maxC) {}
}
