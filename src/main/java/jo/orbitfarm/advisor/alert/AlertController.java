package jo.orbitfarm.advisor.alert;
import jakarta.validation.Valid;import org.springframework.web.bind.annotation.*;import java.util.List;
@RestController @RequestMapping("/api/v1/alerts")public class AlertController{
 private final AlertService service;public AlertController(AlertService service){this.service=service;}
 @GetMapping public List<AlertService.AlertResponse> list(@RequestAttribute("farmerId")Long farmerId){return service.list(farmerId);}
 @GetMapping("/preferences")public AlertService.PreferenceView preferences(@RequestAttribute("farmerId")Long farmerId){return service.preference(farmerId);}
 @PutMapping("/preferences")public AlertService.PreferenceView update(@RequestAttribute("farmerId")Long farmerId,@Valid @RequestBody AlertService.PreferenceRequest request){return service.updatePreference(farmerId,request);}
 @PatchMapping("/{id}/read")public AlertService.AlertResponse markRead(@RequestAttribute("farmerId")Long farmerId,@PathVariable Long id){return service.markRead(farmerId,id);}
}
