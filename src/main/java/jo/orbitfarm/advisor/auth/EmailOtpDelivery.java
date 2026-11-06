package jo.orbitfarm.advisor.auth;

import jo.orbitfarm.advisor.api.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class EmailOtpDelivery {
    private static final Logger log=LoggerFactory.getLogger(EmailOtpDelivery.class);
    private static final HttpClient RESEND_CLIENT=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectProvider<JavaMailSender> mailSenders;
    private final ObjectMapper objectMapper;
    private final String from, appName, mode, resendApiKey;
    public EmailOtpDelivery(ObjectProvider<JavaMailSender> mailSenders, ObjectMapper objectMapper,
            @Value("${advisor.email.from}") String from,
            @Value("${advisor.email.app-name}") String appName,
            @Value("${advisor.email.delivery-mode:smtp}") String mode,
            @Value("${RESEND_API_KEY:}") String resendApiKey) {
        this.mailSenders=mailSenders; this.objectMapper=objectMapper; this.from=from; this.appName=appName; this.mode=mode; this.resendApiKey=resendApiKey;
    }
    public void send(String email,String code,String purpose) {
        if ("console".equalsIgnoreCase(mode)) {
            log.warn("LOCAL EMAIL OTP: purpose={} recipient={} code={}",purpose,email,code);
            return;
        }
        if ("resend".equalsIgnoreCase(mode)) {
            sendWithResend(email,code);
            return;
        }
        JavaMailSender sender=mailSenders.getIfAvailable();
        if(sender==null)throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"EMAIL_NOT_CONFIGURED","خدمة إرسال البريد غير مهيأة بعد. أضف إعدادات SMTP إلى الخادم.");
        SimpleMailMessage message=new SimpleMailMessage();
        message.setFrom(from); message.setTo(email); message.setSubject(appName+" - رمز التحقق");
        message.setText("رمز التحقق الخاص بك هو: "+code+"\n\nينتهي الرمز خلال 10 دقائق، ويمكن استخدامه مرة واحدة فقط. إذا لم تطلبه، تجاهل هذه الرسالة.");
        try{sender.send(message);}catch(MailException ex){log.warn("OTP email delivery failed: {}",ex.toString());throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"EMAIL_DELIVERY_FAILED","تعذر إرسال البريد الآن. تحقق من إعدادات SMTP وحاول لاحقًا.");}
    }

    private void sendWithResend(String email,String code) {
        if(resendApiKey==null||resendApiKey.isBlank())throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"EMAIL_NOT_CONFIGURED","خدمة البريد غير مهيأة بعد. أضف مفتاح Resend إلى الخادم.");
        String body="رمز التحقق الخاص بك هو: "+code+"\n\nينتهي الرمز خلال 10 دقائق، ويمكن استخدامه مرة واحدة فقط. إذا لم تطلبه، تجاهل هذه الرسالة.";
        try {
            String payload=objectMapper.writeValueAsString(Map.of("from",from,"to",List.of(email),"subject",appName+" - رمز التحقق","text",body));
            HttpRequest request=HttpRequest.newBuilder(URI.create("https://api.resend.com/emails"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization","Bearer "+resendApiKey)
                    .header("Content-Type","application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            HttpResponse<String> response=RESEND_CLIENT.send(request,HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()<200||response.statusCode()>=300) {
                log.warn("Resend OTP delivery failed: status={}",response.statusCode());
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"EMAIL_DELIVERY_FAILED","تعذر إرسال البريد الآن. تحقق من إعدادات مزوّد البريد وحاول لاحقًا.");
            }
        } catch(ApiException ex) {
            throw ex;
        } catch(InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("Resend OTP delivery interrupted");
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"EMAIL_DELIVERY_FAILED","تعذر إرسال البريد الآن. حاول لاحقًا.");
        } catch(Exception ex) {
            log.warn("Resend OTP delivery failed: {}",ex.getClass().getSimpleName());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"EMAIL_DELIVERY_FAILED","تعذر إرسال البريد الآن. تحقق من إعدادات مزوّد البريد وحاول لاحقًا.");
        }
    }
}
