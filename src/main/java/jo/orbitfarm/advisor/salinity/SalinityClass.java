package jo.orbitfarm.advisor.salinity;

public enum SalinityClass {
    NO_DATA,
    NON_SALINE,
    SLIGHTLY_SALINE,
    MODERATELY_SALINE,
    HIGHLY_SALINE,
    EXTREMELY_SALINE;

    public boolean hasSalinityRisk() {
        return ordinal() >= SLIGHTLY_SALINE.ordinal() && this != NO_DATA;
    }

    public boolean isModerateOrHigher() {
        return ordinal() >= MODERATELY_SALINE.ordinal() && this != NO_DATA;
    }

    public static SalinityClass fromRasterValue(int value) {
        return switch (value) {
            case 1 -> NON_SALINE;
            case 2 -> SLIGHTLY_SALINE;
            case 3 -> MODERATELY_SALINE;
            case 4 -> HIGHLY_SALINE;
            case 5 -> EXTREMELY_SALINE;
            default -> NO_DATA;
        };
    }
}
