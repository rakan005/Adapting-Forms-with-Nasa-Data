package jo.orbitfarm.advisor.season;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/v1/farms/{farmId}/seasons")
public class FarmSeasonController{
 private final FarmSeasonService service;public FarmSeasonController(FarmSeasonService service){this.service=service;}
 @GetMapping public List<FarmSeasonService.SeasonResponse> list(@RequestAttribute("farmerId")Long farmerId,@PathVariable Long farmId){return service.list(farmerId,farmId);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public FarmSeasonService.SeasonResponse create(@RequestAttribute("farmerId")Long farmerId,@PathVariable Long farmId,@Valid @RequestBody FarmSeasonService.SeasonRequest request){return service.create(farmerId,farmId,request);}
 @DeleteMapping("/{seasonId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@RequestAttribute("farmerId")Long farmerId,@PathVariable Long farmId,@PathVariable Long seasonId){service.delete(farmerId,farmId,seasonId);}
}
