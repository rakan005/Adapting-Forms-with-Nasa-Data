package jo.orbitfarm.advisor.pack;

import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reference")
@Validated
public class ReferenceController {
    private final PackCatalog catalog;
    public ReferenceController(PackCatalog catalog) { this.catalog = catalog; }
    @GetMapping("/packs")
    public List<PackSummary> packs() { return catalog.all().stream().map(p -> new PackSummary(p.code(), p.name(), p.scope(), p.priority(), p.status(), p.demo())).toList(); }
    @GetMapping("/packs/{code}")
    public CropPack pack(@PathVariable String code) { return catalog.find(code).orElseThrow(() -> jo.orbitfarm.advisor.api.ApiException.notFound("Pack " + code)); }
    @GetMapping("/crops") public List<CropPack.Crop> crops() { return catalog.crops(); }
    @GetMapping("/coverage")
    public Coverage coverage(@RequestParam @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal lat,
                             @RequestParam @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal lon) {
        CropPack selected = catalog.resolve(lat, lon).orElse(null);
        return new Coverage(selected == null ? 0 : "LOCAL".equals(selected.scope()) ? 2 : 1, selected == null ? null : selected.code(), selected == null ? null : selected.scope());
    }
    public record PackSummary(String code, String name, String scope, int priority, String status, boolean demo) {}
    public record Coverage(int level, String packCode, String scope) {}
}
