package jo.orbitfarm.advisor.advice;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
public class AdviceController {
    private final AdviceService service;
    public AdviceController(AdviceService service) { this.service = service; }
    @PostMapping("/api/v1/farms/{farmId}/advice")
    @ResponseStatus(HttpStatus.CREATED)
    public AdviceResponse advise(@PathVariable Long farmId,@RequestAttribute("farmerId")Long farmerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf,
            @RequestParam(defaultValue = "en") String lang,
            @RequestParam(required = false) List<String> crops) {
        return service.advise(farmId, farmerId, asOf, lang, crops);
    }
}
