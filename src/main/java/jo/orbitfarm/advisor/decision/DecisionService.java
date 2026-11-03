package jo.orbitfarm.advisor.decision;

import com.fasterxml.jackson.databind.ObjectMapper;
import jo.orbitfarm.advisor.advice.AdviceResponse;
import jo.orbitfarm.advisor.api.ApiException;
import jo.orbitfarm.advisor.farm.FarmService;
import jo.orbitfarm.advisor.pack.PackCatalog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;

@Service
public class DecisionService {
    private final DecisionRecordRepository records;
    private final FarmService farms;
    private final PackCatalog packs;
    private final ObjectMapper mapper;
    public DecisionService(DecisionRecordRepository records, FarmService farms, PackCatalog packs, ObjectMapper mapper) {
        this.records = records; this.farms = farms; this.packs = packs; this.mapper = mapper;
    }
    @Transactional(readOnly = true)
    public AdviceResponse get(Long id) { return response(records.findById(id).orElseThrow(() -> ApiException.notFound("Decision " + id))); }
    @Transactional(readOnly = true)
    public Page<AdviceResponse> list(Long farmId, int page, int size) {
        farms.require(farmId); FarmService.checkPage(page, size);
        return records.findByFarmIdOrderByCreatedAtDesc(farmId, PageRequest.of(page, size, Sort.by("createdAt").descending())).map(this::response);
    }
    @Transactional
    public AdviceResponse recordAction(Long id, ActionRequest request) {
        DecisionRecordEntity record = records.findById(id).orElseThrow(() -> ApiException.notFound("Decision " + id));
        String cropCode = request.cropCode() == null ? null : request.cropCode().toUpperCase(Locale.ROOT);
        if ("PLANTED".equals(request.action()) && (cropCode == null || packs.crops().stream().noneMatch(c -> c.code().equalsIgnoreCase(cropCode)))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNKNOWN_CROP", "A valid cropCode is required when action is PLANTED");
        }
        if (!"PLANTED".equals(request.action())) cropCode = null;
        record.recordAction(request.action(), cropCode);
        AdviceResponse current = response(record).withFarmerAction(request.action(), cropCode, record.getFarmerActionAt());
        try { record.setResponseJson(mapper.writeValueAsString(current)); }
        catch (Exception e) { throw new IllegalStateException("Could not update decision response", e); }
        return response(records.save(record));
    }
    private AdviceResponse response(DecisionRecordEntity record) {
        try { return mapper.readValue(record.getResponseJson(), AdviceResponse.class); }
        catch (Exception e) { throw new IllegalStateException("Stored decision record is invalid", e); }
    }
}
