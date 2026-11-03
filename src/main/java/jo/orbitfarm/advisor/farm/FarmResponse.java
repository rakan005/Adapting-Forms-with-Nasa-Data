package jo.orbitfarm.advisor.farm;

import java.math.BigDecimal;
import java.time.Instant;

public record FarmResponse(Long id, String name, BigDecimal latitude, BigDecimal longitude, Integer elevationM,
                           String irrigation, BigDecimal salinityDsm, String soilDepth, String previousCropCode,
                           Instant createdAt, Instant updatedAt) {
    public static FarmResponse from(FarmEntity f) {
        return new FarmResponse(f.getId(), f.getName(), f.getLatitude(), f.getLongitude(), f.getElevationM(),
                f.getIrrigation(), f.getSalinityDsm(), f.getSoilDepth(), f.getPreviousCropCode(), f.getCreatedAt(), f.getUpdatedAt());
    }
}
