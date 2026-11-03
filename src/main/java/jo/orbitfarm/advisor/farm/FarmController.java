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
    public FarmResponse create(@Valid @RequestBody FarmRequest request) { return service.create(request); }
    @GetMapping("/{id}") public FarmResponse get(@PathVariable Long id) { return service.get(id); }
    @GetMapping public Page<FarmResponse> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) { return service.list(page, size); }
    @PutMapping("/{id}") public FarmResponse update(@PathVariable Long id, @Valid @RequestBody FarmRequest request) { return service.update(id, request); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { service.delete(id); }
}
