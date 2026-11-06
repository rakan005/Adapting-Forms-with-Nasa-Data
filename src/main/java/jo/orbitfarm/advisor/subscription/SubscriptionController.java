package jo.orbitfarm.advisor.subscription;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Pattern;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/v1/subscriptions")
public class SubscriptionController {
 private final SubscriptionService service;public SubscriptionController(SubscriptionService service){this.service=service;}
 @GetMapping("/plans") public List<SubscriptionService.Plan> plans(){return service.plans();}
 @GetMapping("/me") public SubscriptionService.SubscriptionView current(@RequestAttribute("farmerId")Long farmerId){return service.current(farmerId);}
 @PutMapping("/me") public SubscriptionService.SubscriptionView select(@RequestAttribute("farmerId")Long farmerId,@RequestBody PlanRequest request){return service.select(farmerId,request.planCode());}
 public record PlanRequest(@Pattern(regexp="FREE|GROWER|PRO") String planCode){}
}
