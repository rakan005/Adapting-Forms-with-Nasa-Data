package jo.orbitfarm.advisor.auth;

import jo.orbitfarm.advisor.api.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Service
public class EmailOtpService {
    private static final SecureRandom RANDOM=new SecureRandom();
    private final EmailCodeRepository codes; private final EmailOtpDelivery delivery;
    private final String secret; private final int ttlMinutes,cooldownSeconds,maxAttempts;
    public EmailOtpService(EmailCodeRepository codes,EmailOtpDelivery delivery,
            @Value("${advisor.otp.hash-secret}") String secret,
            @Value("${advisor.otp.code-ttl-minutes:10}") int ttlMinutes,
            @Value("${advisor.otp.resend-cooldown-seconds:60}") int cooldownSeconds,
            @Value("${advisor.otp.max-attempts:5}") int maxAttempts) {
        this.codes=codes; this.delivery=delivery; this.secret=secret; this.ttlMinutes=ttlMinutes; this.cooldownSeconds=cooldownSeconds; this.maxAttempts=maxAttempts;
    }
    @Transactional
    public void send(String email,String purpose,String fullName,String phone){
        Instant now=Instant.now();
        codes.findFirstByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(email,purpose).ifPresent(latest->{
            if(latest.getCreatedAt().plusSeconds(cooldownSeconds).isAfter(now))throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"OTP_COOLDOWN","انتظر قليلًا قبل طلب رمز جديد.");
        });
        codes.findAllByEmailAndPurposeAndConsumedAtIsNull(email,purpose).forEach(EmailCodeEntity::consume);
        String code=String.format("%06d",RANDOM.nextInt(1_000_000));
        codes.save(new EmailCodeEntity(email,purpose,hash(email,purpose,code),fullName,phone,now.plus(ttlMinutes,ChronoUnit.MINUTES)));
        delivery.send(email,code,purpose);
    }
    @Transactional
    public EmailCodeEntity verify(String email,String purpose,String code){
        EmailCodeEntity row=codes.findFirstByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(email,purpose).orElse(null);
        if(row==null)return null;
        if(row.getExpiresAt().isBefore(Instant.now())||row.getAttemptCount()>=maxAttempts){row.consume();codes.save(row);return null;}
        row.incrementAttempts();
        boolean valid=MessageDigest.isEqual(row.getCodeHash().getBytes(StandardCharsets.US_ASCII),hash(email,purpose,code).getBytes(StandardCharsets.US_ASCII));
        if(valid)row.consume();
        codes.save(row);
        return valid?row:null;
    }
    private String hash(String email,String purpose,String code){
        try{Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));byte[] digest=mac.doFinal((email+"\n"+purpose+"\n"+code).getBytes(StandardCharsets.UTF_8));return HexFormat.of().formatHex(digest);}
        catch(Exception ex){throw new IllegalStateException("Could not hash email verification code",ex);}
    }
}
