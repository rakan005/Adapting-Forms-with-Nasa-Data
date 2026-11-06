package jo.orbitfarm.advisor.season;
import jo.orbitfarm.advisor.api.ApiException;
import jo.orbitfarm.advisor.farm.FarmService;
import jo.orbitfarm.advisor.subscription.SubscriptionService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
@Service public class FarmSeasonService{
 private final FarmSeasonRepository seasons;private final FarmService farms;private final SubscriptionService subscriptions;
 public FarmSeasonService(FarmSeasonRepository seasons,FarmService farms,SubscriptionService subscriptions){this.seasons=seasons;this.farms=farms;this.subscriptions=subscriptions;}
 @Transactional(readOnly=true) public List<SeasonResponse> list(Long farmerId,Long farmId){farms.requireOwned(farmId,farmerId);return seasons.findAllByFarmIdOrderByPlantingDateDesc(farmId).stream().map(SeasonResponse::from).toList();}
 @Transactional public SeasonResponse create(Long farmerId,Long farmId,SeasonRequest request){farms.requireOwned(farmId,farmerId);int limit=subscriptions.effectivePlan(farmerId).decisionHistoryLimit();if(seasons.countByFarmId(farmId)>=limit)throw new ApiException(HttpStatus.PAYMENT_REQUIRED,"SEASON_HISTORY_LIMIT_REACHED","وصلت لحد سجل المواسم في خطتك.");String status=request.status()==null?"PLANNED":request.status();return SeasonResponse.from(seasons.save(new FarmSeasonEntity(farmId,request.cropCode().trim().toUpperCase(),request.seasonLabel().trim(),request.plantingDate(),request.harvestDate(),status,request.yieldKg(),blank(request.notes()))));}
 @Transactional public void delete(Long farmerId,Long farmId,Long seasonId){farms.requireOwned(farmId,farmerId);FarmSeasonEntity row=seasons.findById(seasonId).filter(s->s.getFarmId().equals(farmId)).orElseThrow(()->ApiException.notFound("Season record"));seasons.delete(row);}
 private static String blank(String s){return s==null||s.isBlank()?null:s.trim();}
 public record SeasonRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=40)String cropCode,@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=80)String seasonLabel,LocalDate plantingDate,LocalDate harvestDate,@jakarta.validation.constraints.Pattern(regexp="PLANNED|PLANTED|HARVESTED|FAILED")String status,@jakarta.validation.constraints.DecimalMin("0")BigDecimal yieldKg,@jakarta.validation.constraints.Size(max=1000)String notes){}
 public record SeasonResponse(Long id,Long farmId,String cropCode,String seasonLabel,LocalDate plantingDate,LocalDate harvestDate,String status,BigDecimal yieldKg,String notes){static SeasonResponse from(FarmSeasonEntity s){return new SeasonResponse(s.getId(),s.getFarmId(),s.getCropCode(),s.getSeasonLabel(),s.getPlantingDate(),s.getHarvestDate(),s.getStatus(),s.getYieldKg(),s.getNotes());}}
}
