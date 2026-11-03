package jo.orbitfarm.advisor.farm;

import jo.orbitfarm.advisor.api.ApiException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FarmService {
    private final FarmRepository farms;
    public FarmService(FarmRepository farms) { this.farms = farms; }

    @Transactional
    public FarmResponse create(FarmRequest r) {
        return FarmResponse.from(farms.save(new FarmEntity(r.name(), r.latitude(), r.longitude(), r.elevationM(),
                r.irrigation(), r.salinityDsm(), r.soilDepth(), r.previousCropCode())));
    }
    @Transactional(readOnly = true)
    public FarmEntity require(Long id) { return farms.findById(id).orElseThrow(() -> ApiException.notFound("Farm " + id)); }
    @Transactional(readOnly = true)
    public FarmResponse get(Long id) { return FarmResponse.from(require(id)); }
    @Transactional(readOnly = true)
    public Page<FarmResponse> list(int page, int size) {
        checkPage(page, size);
        return farms.findAll(PageRequest.of(page, size, Sort.by("id").descending())).map(FarmResponse::from);
    }
    @Transactional
    public FarmResponse update(Long id, FarmRequest r) {
        FarmEntity farm = require(id);
        farm.update(r.name(), r.latitude(), r.longitude(), r.elevationM(), r.irrigation(), r.salinityDsm(), r.soilDepth(), r.previousCropCode());
        return FarmResponse.from(farms.save(farm));
    }
    @Transactional
    public void delete(Long id) {
        FarmEntity farm = require(id);
        farms.delete(farm);
    }
    public static void checkPage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PAGE", "page must be >= 0 and size must be between 1 and 100");
    }
}
