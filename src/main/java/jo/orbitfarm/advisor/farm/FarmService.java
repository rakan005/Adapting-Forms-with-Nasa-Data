package jo.orbitfarm.advisor.farm;

import jo.orbitfarm.advisor.api.ApiException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jo.orbitfarm.advisor.subscription.SubscriptionService;

@Service
public class FarmService {
    private final FarmRepository farms;
    private final SubscriptionService subscriptions;
    public FarmService(FarmRepository farms, SubscriptionService subscriptions) { this.farms = farms; this.subscriptions=subscriptions; }

    @Transactional
    public FarmResponse create(Long farmerId,FarmRequest r) {
        int limit=subscriptions.effectivePlan(farmerId).maxFarms();
        if(farms.countByFarmerId(farmerId)>=limit)throw new ApiException(HttpStatus.PAYMENT_REQUIRED,"FARM_LIMIT_REACHED","وصلت للحد الأقصى للأراضي في خطتك. راجع الاشتراكات لزيادة الحد.");
        return FarmResponse.from(farms.save(new FarmEntity(farmerId,r.name(), r.latitude(), r.longitude(), r.areaDunum(), r.elevationM(),
                r.irrigation(), r.salinityDsm(), r.salinityClassOverride(), r.soilDepth(), r.previousCropCode())));
    }
    @Transactional(readOnly = true)
    public FarmEntity require(Long id) { return farms.findById(id).orElseThrow(() -> ApiException.notFound("Farm " + id)); }
    @Transactional(readOnly = true)
    public FarmEntity requireOwned(Long id,Long farmerId) { return farms.findByIdAndFarmerId(id,farmerId).orElseThrow(() -> ApiException.notFound("Farm " + id)); }
    @Transactional(readOnly = true)
    public FarmResponse get(Long id,Long farmerId) { return FarmResponse.from(requireOwned(id,farmerId)); }
    @Transactional(readOnly = true)
    public Page<FarmResponse> list(Long farmerId,int page, int size) {
        checkPage(page, size);
        return farms.findAllByFarmerId(farmerId,PageRequest.of(page, size, Sort.by("id").descending())).map(FarmResponse::from);
    }
    @Transactional
    public FarmResponse update(Long id,Long farmerId,FarmRequest r) {
        FarmEntity farm = requireOwned(id,farmerId);
        farm.update(r.name(), r.latitude(), r.longitude(), r.areaDunum(), r.elevationM(), r.irrigation(), r.salinityDsm(), r.salinityClassOverride(), r.soilDepth(), r.previousCropCode());
        return FarmResponse.from(farms.save(farm));
    }
    @Transactional
    public void delete(Long id,Long farmerId) {
        FarmEntity farm = requireOwned(id,farmerId);
        farms.delete(farm);
    }
    public static void checkPage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PAGE", "page must be >= 0 and size must be between 1 and 100");
    }
}
