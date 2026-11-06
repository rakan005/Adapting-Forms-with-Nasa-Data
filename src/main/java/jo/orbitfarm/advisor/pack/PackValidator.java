package jo.orbitfarm.advisor.pack;

import java.util.*;

public final class PackValidator {
    private PackValidator() {}

    public static List<String> validate(CropPack pack) {
        List<String> errors = new ArrayList<>();
        if (pack == null) return List.of("pack is empty");
        if (blank(pack.code())) errors.add("code is required");
        if (blank(pack.name())) errors.add("name is required");
        if (pack.scope() == null || !Set.of("LOCAL", "GENERAL").contains(pack.scope())) errors.add("scope must be LOCAL or GENERAL");
        if (pack.status() == null || !Set.of("DRAFT", "REVIEWED").contains(pack.status())) errors.add("status must be DRAFT or REVIEWED");
        if (pack.regions() == null || pack.regions().isEmpty()) errors.add("at least one region is required");
        else for (int i = 0; i < pack.regions().size(); i++) {
            CropPack.Region region = pack.regions().get(i);
            if (region == null || region.minLat() == null || region.maxLat() == null || region.minLon() == null || region.maxLon() == null
                    || region.minLat().compareTo(region.maxLat()) >= 0 || region.minLon().compareTo(region.maxLon()) >= 0
                    || region.minLat().compareTo(java.math.BigDecimal.valueOf(-90)) < 0 || region.maxLat().compareTo(java.math.BigDecimal.valueOf(90)) > 0
                    || region.minLon().compareTo(java.math.BigDecimal.valueOf(-180)) < 0 || region.maxLon().compareTo(java.math.BigDecimal.valueOf(180)) > 0) {
                errors.add("regions[" + i + "] has invalid bounds");
            }
        }
        if (pack.crops() == null || pack.crops().isEmpty()) errors.add("at least one crop is required");
        else {
            Set<String> codes = new HashSet<>();
            for (int i = 0; i < pack.crops().size(); i++) {
                CropPack.Crop crop = pack.crops().get(i);
                if (crop == null || blank(crop.code()) || blank(crop.nameEn()) || blank(crop.nameAr())) {
                    errors.add("crops[" + i + "] requires code and bilingual names");
                    continue;
                }
                if (!codes.add(crop.code().toUpperCase(Locale.ROOT))) errors.add("duplicate crop code " + crop.code());
                if (crop.salinityLimitDsm() != null && crop.salinityLimitDsm().signum() < 0) errors.add(crop.code() + ": salinityLimitDsm cannot be negative");
                if (crop.heatLimitC() < -20 || crop.heatLimitC() > 70) errors.add(crop.code() + ": heatLimitC is out of range");
                if (crop.sowingWindows() != null) for (CropPack.MonthWindow window : crop.sowingWindows()) {
                    if (window == null || window.startMonth() < 1 || window.startMonth() > 12 || window.endMonth() < 1 || window.endMonth() > 12)
                        errors.add(crop.code() + ": sowing window month must be between 1 and 12");
                }
                if (crop.phaseLimits() != null) for (CropPack.PhaseLimit phase : crop.phaseLimits()) {
                    if (phase == null || phase.startMonth() < 1 || phase.startMonth() > 12 || phase.endMonth() < 1 || phase.endMonth() > 12
                            || phase.heatLimitC() < -20 || phase.heatLimitC() > 70)
                        errors.add(crop.code() + ": invalid phase heat limit");
                }
                if (crop.gddBaseTempC() != null && crop.gddUpperTempC() != null && crop.gddBaseTempC().compareTo(crop.gddUpperTempC()) > 0)
                    errors.add(crop.code() + ": GDD base temperature exceeds upper temperature");
            }
        }
        if (pack.thresholds() == null) errors.add("thresholds are required");
        else if (pack.thresholds().rainDeficitPercent() < 0 || pack.thresholds().rainDeficitPercent() > 100
                || pack.thresholds().heatMarginC() == null || pack.thresholds().heatMarginC().signum() < 0
                || pack.thresholds().nitrogenBoost() == null || pack.thresholds().nitrogenBoost().signum() < 0) {
            errors.add("thresholds contain invalid values");
        }
        return List.copyOf(errors);
    }

    private static boolean blank(String value) { return value == null || value.isBlank(); }
}
