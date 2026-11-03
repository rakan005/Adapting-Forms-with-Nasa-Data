package jo.orbitfarm.advisor.decision;

import jakarta.validation.Valid;
import jo.orbitfarm.advisor.advice.AdviceResponse;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class DecisionController {
    private final DecisionService service;
    public DecisionController(DecisionService service) { this.service = service; }
    @GetMapping("/decisions/{id}") public AdviceResponse get(@PathVariable Long id) { return service.get(id); }
    @GetMapping("/farms/{farmId}/decisions")
    public Page<AdviceResponse> list(@PathVariable Long farmId, @RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "20") int size) { return service.list(farmId, page, size); }
    @PatchMapping("/decisions/{id}") @ResponseStatus(HttpStatus.OK)
    public AdviceResponse recordAction(@PathVariable Long id, @Valid @RequestBody ActionRequest request) { return service.recordAction(id, request); }
}
