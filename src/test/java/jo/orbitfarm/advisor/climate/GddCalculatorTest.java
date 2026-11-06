package jo.orbitfarm.advisor.climate;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class GddCalculatorTest {
    @Test
    void calculatesDailyMeanAboveBaseAndCapsMaximumTemperature() {
        var days = List.of(
                new ClimateProvider.DailyTemperature(LocalDate.parse("2026-04-01"), new BigDecimal("10"), new BigDecimal("20")),
                new ClimateProvider.DailyTemperature(LocalDate.parse("2026-04-02"), new BigDecimal("0"), new BigDecimal("8")));
        assertEquals(new BigDecimal("4.0"), GddCalculator.accumulated(days, new BigDecimal("10"), new BigDecimal("18")));
    }

    @Test
    void returnsNullWhenThePackHasNoBaseTemperature() {
        assertNull(GddCalculator.accumulated(List.of(), null, null));
    }
}
