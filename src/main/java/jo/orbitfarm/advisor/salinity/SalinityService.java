package jo.orbitfarm.advisor.salinity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.zip.GZIPInputStream;
import java.math.BigDecimal;

@Service
public class SalinityService {
    private static final String DATA_PATH = "salinity/undp-salinity-2016.json.gz";
    private final Grid grid;

    public SalinityService(ObjectMapper mapper) {
        try (InputStream resource = new ClassPathResource(DATA_PATH).getInputStream();
             InputStream input = new GZIPInputStream(resource)) {
            JsonNode root = mapper.readTree(input);
            JsonNode bounds = root.path("bounds"); // [south, west, north, east]
            int width = root.path("width").asInt();
            int height = root.path("height").asInt();
            int[] values = new int[root.path("values").size()];
            for (int i = 0; i < values.length; i++) values[i] = root.path("values").get(i).asInt();
            if (width <= 0 || height <= 0 || values.length != width * height || bounds.size() != 4) {
                throw new IllegalStateException("Salinity raster grid is incomplete");
            }
            grid = new Grid(width, height, bounds.get(0).decimalValue(), bounds.get(1).decimalValue(),
                    bounds.get(2).decimalValue(), bounds.get(3).decimalValue(), values);
        } catch (Exception e) {
            throw new IllegalStateException("Could not load regional salinity classification", e);
        }
    }

    public Assessment assess(BigDecimal latitude, BigDecimal longitude, BigDecimal measuredDsm,
                             SalinityClass userOverride) {
        SalinityClass regional = grid.sample(latitude, longitude);
        SalinityClass effective = userOverride != null ? userOverride : regional;
        String source = userOverride != null ? "USER_OVERRIDE" : regional == SalinityClass.NO_DATA ? "NO_DATA" : "UNDP_GEOHUB_2016";
        return new Assessment(effective, regional, source, userOverride != null, measuredDsm,
                "UNDP GeoHub 2016 global soil salinity map; 1 km published resolution; model validation 67–70%; categorical classes only.",
                "https://geohub.data.undp.org/data/d65242be633be3fb99d5519831ea1744", "CC BY 4.0");
    }

    public SalinityClass regionalClass(BigDecimal latitude, BigDecimal longitude) {
        return grid.sample(latitude, longitude);
    }

    public record Assessment(SalinityClass classification, SalinityClass regionalClassification, String source,
                             boolean userOverride, BigDecimal measuredDsm, String note, String sourceUrl, String license) {}

    private record Grid(int width, int height, BigDecimal south, BigDecimal west, BigDecimal north,
                        BigDecimal east, int[] values) {
        SalinityClass sample(BigDecimal lat, BigDecimal lon) {
            if (lat == null || lon == null || lat.compareTo(south) < 0 || lat.compareTo(north) > 0
                    || lon.compareTo(west) < 0 || lon.compareTo(east) > 0) return SalinityClass.NO_DATA;
            int col = lon.subtract(west).divide(east.subtract(west), 10, java.math.RoundingMode.DOWN)
                    .multiply(BigDecimal.valueOf(width)).intValue();
            int row = north.subtract(lat).divide(north.subtract(south), 10, java.math.RoundingMode.DOWN)
                    .multiply(BigDecimal.valueOf(height)).intValue();
            col = Math.max(0, Math.min(width - 1, col));
            row = Math.max(0, Math.min(height - 1, row));
            return SalinityClass.fromRasterValue(values[row * width + col]);
        }
    }
}
