package jo.orbitfarm.advisor.auth;

import jo.orbitfarm.advisor.api.ApiException;
import jo.orbitfarm.advisor.subscription.SubscriptionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class AuthService {
    private static final SecureRandom RANDOM=new SecureRandom();
    private final FarmerRepository farmers; private final AuthSessionRepository sessions;
    private final SubscriptionService subscriptions; private final EmailOtpService otp;
    private final int ttlMinutes,cooldownSeconds;
    public AuthService(FarmerRepository farmers,AuthSessionRepository sessions,SubscriptionService subscriptions,EmailOtpService otp,
            @Value("${advisor.otp.code-ttl-minutes:10}") int ttlMinutes,
            @Value("${advisor.otp.resend-cooldown-seconds:60}") int cooldownSeconds){
        this.farmers=farmers;this.sessions=sessions;this.subscriptions=subscriptions;this.otp=otp;this.ttlMinutes=ttlMinutes;this.cooldownSeconds=cooldownSeconds;
    }
    @Transactional
    public CodeResponse requestRegistrationCode(RegisterRequest request){
        String email=normalize(request.email());
        if(farmers.existsByEmailIgnoreCase(email))throw new ApiException(HttpStatus.CONFLICT,"EMAIL_ALREADY_REGISTERED","هذا البريد مرتبط بحساب. استخدم تسجيل الدخول.");
        otp.send(email,"REGISTER",request.fullName().trim(),blankToNull(request.phone()));
        return new CodeResponse("أرسلنا رمز التحقق إلى بريدك. أدخله لإكمال إنشاء الحساب.",ttlMinutes*60,cooldownSeconds);
    }
    @Transactional
    public AuthResponse verifyRegistrationCode(VerifyCodeRequest request){
        String email=normalize(request.email());EmailCodeEntity verified=otp.verify(email,"REGISTER",normalizeCode(request.code()));
        if(verified==null)throw invalidCode();
        if(farmers.existsByEmailIgnoreCase(email))throw new ApiException(HttpStatus.CONFLICT,"EMAIL_ALREADY_REGISTERED","هذا البريد مرتبط بحساب. استخدم تسجيل الدخول.");
        FarmerEntity farmer=farmers.save(new FarmerEntity(verified.getFullName(),email,verified.getPhone(),null));
        subscriptions.ensureFreeSubscription(farmer.getId());return issue(farmer);
    }
    @Transactional
    public CodeResponse requestLoginCode(EmailRequest request){
        String email=normalize(request.email());
        farmers.findByEmailIgnoreCase(email).ifPresent(farmer->otp.send(email,"LOGIN",null,null));
        return new CodeResponse("إذا كان البريد مسجلًا، سيصلك رمز دخول خلال لحظات.",ttlMinutes*60,cooldownSeconds);
    }
    @Transactional
    public AuthResponse verifyLoginCode(VerifyCodeRequest request){
        String email=normalize(request.email());EmailCodeEntity verified=otp.verify(email,"LOGIN",normalizeCode(request.code()));
        if(verified==null)throw invalidCode();
        FarmerEntity farmer=farmers.findByEmailIgnoreCase(email).orElseThrow(AuthService::invalidCode);return issue(farmer);
    }
    @Transactional(readOnly=true)
    public Long resolve(String rawToken){return sessions.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(sha256(rawToken),Instant.now()).map(AuthSessionEntity::getFarmerId).orElse(null);}
    @Transactional
    public void logout(String rawToken){sessions.findByTokenHashAndRevokedAtIsNull(sha256(rawToken)).ifPresent(AuthSessionEntity::revoke);}
    @Transactional(readOnly=true)
    public FarmerResponse current(Long farmerId){FarmerEntity f=farmers.findById(farmerId).orElseThrow(()->ApiException.notFound("Farmer"));return FarmerResponse.from(f);}
    private AuthResponse issue(FarmerEntity farmer){byte[] bytes=new byte[32];RANDOM.nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);Instant exp=Instant.now().plus(7,ChronoUnit.DAYS);sessions.save(new AuthSessionEntity(farmer.getId(),sha256(token),exp));return new AuthResponse(token,"Bearer",exp,FarmerResponse.from(farmer));}
    private static ApiException invalidCode(){return new ApiException(HttpStatus.UNAUTHORIZED,"INVALID_OR_EXPIRED_CODE","الرمز غير صحيح أو منتهي. اطلب رمزًا جديدًا وحاول مرة أخرى.");}
    private static String normalize(String email){return email.trim().toLowerCase(Locale.ROOT);}
    private static String normalizeCode(String code){return code==null?"":code.trim();}
    private static String sha256(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    private static String blankToNull(String s){return s==null||s.isBlank()?null:s.trim();}
    public record RegisterRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=120) String fullName,@jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=254) String email,@jakarta.validation.constraints.Size(max=30) String phone){}
    public record EmailRequest(@jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=254) String email){}
    public record VerifyCodeRequest(@jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=254) String email,@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Pattern(regexp="[0-9]{6}",message="رمز التحقق يتكون من 6 أرقام") String code){}
    public record CodeResponse(String message,int expiresInSeconds,int resendAfterSeconds){}
    public record FarmerResponse(Long id,String fullName,String email,String phone,Instant createdAt){static FarmerResponse from(FarmerEntity f){return new FarmerResponse(f.getId(),f.getFullName(),f.getEmail(),f.getPhone(),f.getCreatedAt());}}
    public record AuthResponse(String accessToken,String tokenType,Instant expiresAt,FarmerResponse farmer){}
}
