package jo.orbitfarm.advisor.decision;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ActionRequest(@NotBlank @Pattern(regexp = "PLANTED|FALLOW|OTHER") String action,
                            @Size(max = 40) String cropCode) {}
