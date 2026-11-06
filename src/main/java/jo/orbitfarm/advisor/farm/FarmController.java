package jo.orbitfarm.advisor.farm;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/farms")
public class FarmController {
    private final FarmService service;
    public FarmController(FarmService service) { this.service = service; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public FarmResponse create(@RequestAttribute("farmerId")Long farmerId,@Valid @RequestBody FarmRequest request) { return service.create(farmerId,request); }
    @GetMapping("/{id}") public FarmResponse get(@PathVariable Long id,@RequestAttribute("farmerId")Long farmerId) { return service.get(id,farmerId); }
    @GetMapping public Page<FarmResponse> list(@RequestAttribute("farmerId")Long farmerId,@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) { return service.list(farmerId,page, size); }
    @PutMapping("/{id}") public FarmResponse update(@PathVariable Long id,@RequestAttribute("farmerId")Long farmerId,@Valid @RequestBody FarmRequest request) { return service.update(id,farmerId, request); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id,@RequestAttribute("farmerId")Long farmerId) { service.delete(id,farmerId); }
}
