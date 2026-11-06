package jo.orbitfarm.advisor.climate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public final class GddCalculator {
    private GddCalculator() {}

    public static BigDecimal accumulated(List<ClimateProvider.DailyTemperature> days,
                                         BigDecimal baseC, BigDecimal upperC) {
        if (days == null || days.isEmpty() || baseC == null) return null;
        BigDecimal total = BigDecimal.ZERO;
        for (ClimateProvider.DailyTemperature day : days) {
            if (day == null || day.minC() == null || day.maxC() == null) continue;
            BigDecimal max = upperC == null ? day.maxC() : day.maxC().min(upperC);
            BigDecimal mean = day.minC().add(max).divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP);
            total = total.add(mean.subtract(baseC).max(BigDecimal.ZERO));
        }
        return total.setScale(1, RoundingMode.HALF_UP);
    }
}
