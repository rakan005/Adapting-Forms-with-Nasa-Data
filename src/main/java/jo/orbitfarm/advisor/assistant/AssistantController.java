package jo.orbitfarm.advisor.assistant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assistant")
public class AssistantController {
    private final AiAssistantService service;
    public AssistantController(AiAssistantService service) { this.service = service; }

    @PostMapping("/chat")
    public AiAssistantService.ChatResponse chat(@Valid @RequestBody ChatRequest request) {
        return service.chat(request);
    }

    @PostMapping("/organize")
    public AiAssistantService.OrganizedData organize(@Valid @RequestBody OrganizeRequest request) {
        return service.organize(request);
    }

    public record ChatRequest(Long farmId, @NotBlank @Size(max = 2000) String message,
                              @Size(max = 12) List<@Valid ChatTurn> history) {}
    public record ChatTurn(@Pattern(regexp = "user|assistant") String role,
                           @NotBlank @Size(max = 2000) String content) {}
    public record OrganizeRequest(Long farmId, @NotBlank @Size(max = 6000) String text) {}
}
