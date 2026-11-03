package jo.orbitfarm.advisor.pack;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class PackCatalog {
    private final List<CropPack> packs;
    public PackCatalog(ObjectMapper mapper, ResourcePatternResolver resolver, @Value("${advisor.packs.location:classpath:/packs/}") String location) {
        List<CropPack> loaded = new ArrayList<>();
        try {
            Resource[] resources = resolver.getResources(location.endsWith("/") ? location + "*.json" : location + "/*.json");
            for (Resource resource : resources) loaded.add(mapper.readValue(resource.getInputStream(), CropPack.class));
        } catch (Exception ex) {
            throw new IllegalStateException("Could not load crop knowledge packs from " + location, ex);
        }
        this.packs = List.copyOf(loaded);
    }
    public List<CropPack> all() { return packs; }
    public List<CropPack> active() { return packs.stream().filter(p -> "REVIEWED".equals(p.status()) || "APPROVED".equals(p.status())).toList(); }
    public Optional<CropPack> find(String code) { return packs.stream().filter(p -> p.code().equalsIgnoreCase(code)).findFirst(); }
    public Optional<CropPack> resolve(java.math.BigDecimal lat, java.math.BigDecimal lon) {
        return active().stream().filter(p -> p.regions() != null && p.regions().stream().anyMatch(r -> r.contains(lat, lon)))
                .sorted(Comparator.comparing((CropPack p) -> "LOCAL".equals(p.scope()) ? 0 : 1)
                        .thenComparing(Comparator.comparingInt(CropPack::priority).reversed()).thenComparing(CropPack::code))
                .findFirst();
    }
    public List<CropPack.Crop> crops() { return packs.stream().filter(p -> p.crops() != null).flatMap(p -> p.crops().stream()).toList(); }
}
