package jo.orbitfarm.advisor.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService service;
    public AuthController(AuthService service){this.service=service;}
    @PostMapping("/register/request-code") public AuthService.CodeResponse requestRegistrationCode(@Valid @RequestBody AuthService.RegisterRequest request){return service.requestRegistrationCode(request);}
    @PostMapping("/register/verify-code") @ResponseStatus(HttpStatus.CREATED) public AuthService.AuthResponse verifyRegistrationCode(@Valid @RequestBody AuthService.VerifyCodeRequest request){return service.verifyRegistrationCode(request);}
    @PostMapping("/login/request-code") public AuthService.CodeResponse requestLoginCode(@Valid @RequestBody AuthService.EmailRequest request){return service.requestLoginCode(request);}
    @PostMapping("/login/verify-code") public AuthService.AuthResponse verifyLoginCode(@Valid @RequestBody AuthService.VerifyCodeRequest request){return service.verifyLoginCode(request);}
    @GetMapping("/me") public AuthService.FarmerResponse me(@RequestAttribute("farmerId") Long farmerId){return service.current(farmerId);}
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT) public void logout(HttpServletRequest request){String token=request.getHeader("Authorization").substring(7);service.logout(token);}
}
