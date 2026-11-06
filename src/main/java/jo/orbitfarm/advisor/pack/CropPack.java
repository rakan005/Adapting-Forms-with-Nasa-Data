package jo.orbitfarm.advisor.pack;

import java.math.BigDecimal;
import java.util.List;

public record CropPack(String code, String name, String scope, int priority, String status, boolean demo,
                       String hemisphere, String language, List<Region> regions, List<Crop> crops,
                       Thresholds thresholds) {
    public record Region(String name, BigDecimal minLat, BigDecimal maxLat, BigDecimal minLon, BigDecimal maxLon) {
        public boolean contains(BigDecimal lat, BigDecimal lon) {
            return lat.compareTo(minLat) >= 0 && lat.compareTo(maxLat) <= 0 && lon.compareTo(minLon) >= 0 && lon.compareTo(maxLon) <= 0;
        }
    }
    public record MonthWindow(int startMonth, int endMonth) {
        public boolean includes(int month) { return startMonth <= endMonth ? month >= startMonth && month <= endMonth : month >= startMonth || month <= endMonth; }
    }
    public record PhaseLimit(String stage, int startMonth, int endMonth, int heatLimitC) {
        public boolean includes(int month) { return startMonth <= endMonth ? month >= startMonth && month <= endMonth : month >= startMonth || month <= endMonth; }
    }
    public record Crop(String code, String nameEn, String nameAr, String family, BigDecimal salinityLimitDsm,
                       String waterDemand, boolean requiresIrrigation, int heatLimitC, boolean legume,
                       List<MonthWindow> sowingWindows, List<PhaseLimit> phaseLimits,
                       BigDecimal gddBaseTempC, BigDecimal gddUpperTempC) {}
    public record Thresholds(int rainDeficitPercent, BigDecimal heatMarginC, BigDecimal nitrogenBoost) {}
}
