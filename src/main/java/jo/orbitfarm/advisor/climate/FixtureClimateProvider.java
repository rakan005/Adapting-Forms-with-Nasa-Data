package jo.orbitfarm.advisor.climate;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;

@Component
@Profile("!nasa")
public class FixtureClimateProvider implements ClimateProvider {
    @Override public ClimateSnapshot getSnapshot(BigDecimal latitude, BigDecimal longitude) {
        // Deliberately fixed demonstration values; they are not observations for this location.
        return new ClimateSnapshot(new BigDecimal("-28.0"), new BigDecimal("2.4"), new BigDecimal("31.5"), false,
                BigDecimal.ZERO, java.util.List.of());
    }
    @Override public String source() { return "FIXTURE_DEMO"; }
}
