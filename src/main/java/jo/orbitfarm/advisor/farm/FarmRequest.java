package jo.orbitfarm.advisor.farm;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record FarmRequest(
        @Size(max = 120) String name,
        @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
        @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
        @NotNull @DecimalMin(value = "0.01") @DecimalMax(value = "100000") BigDecimal areaDunum,
        @Min(-500) @Max(9000) Integer elevationM,
        @Pattern(regexp = "NONE|LIMITED|FULL", message = "must be NONE, LIMITED, or FULL") String irrigation,
        @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal salinityDsm,
        jo.orbitfarm.advisor.salinity.SalinityClass salinityClassOverride,
        @Size(max = 30) String soilDepth,
        @Size(max = 40) String previousCropCode
) {}
