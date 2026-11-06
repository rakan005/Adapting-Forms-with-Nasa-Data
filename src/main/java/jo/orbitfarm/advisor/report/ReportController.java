package jo.orbitfarm.advisor.report;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/farms/{farmId}/decisions/{decisionId}/report")public class ReportController{
 private final ReportService service;public ReportController(ReportService service){this.service=service;}
 @GetMapping public ReportService.ReportResponse get(@RequestAttribute("farmerId")Long farmerId,@PathVariable Long farmId,@PathVariable Long decisionId){return service.get(farmerId,farmId,decisionId);}
}
