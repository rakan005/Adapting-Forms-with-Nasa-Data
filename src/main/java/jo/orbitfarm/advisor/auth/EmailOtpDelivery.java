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

@Component
public class EmailOtpDelivery {
    private static final Logger log=LoggerFactory.getLogger(EmailOtpDelivery.class);
    private final ObjectProvider<JavaMailSender> mailSenders;
    private final String from, appName, mode;
    public EmailOtpDelivery(ObjectProvider<JavaMailSender> mailSenders,
            @Value("${advisor.email.from}") String from,
            @Value("${advisor.email.app-name}") String appName,
            @Value("${advisor.email.delivery-mode:smtp}") String mode) {
        this.mailSenders=mailSenders; this.from=from; this.appName=appName; this.mode=mode;
    }
    public void send(String email,String code,String purpose) {
        if ("console".equalsIgnoreCase(mode)) {
            log.warn("LOCAL EMAIL OTP: purpose={} recipient={} code={}",purpose,email,code);
            return;
        }
        JavaMailSender sender=mailSenders.getIfAvailable();
        if(sender==null)throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"EMAIL_NOT_CONFIGURED","خدمة إرسال البريد غير مهيأة بعد. أضف إعدادات SMTP إلى الخادم.");
        SimpleMailMessage message=new SimpleMailMessage();
        message.setFrom(from); message.setTo(email); message.setSubject(appName+" - رمز التحقق");
        message.setText("رمز التحقق الخاص بك هو: "+code+"\n\nينتهي الرمز خلال 10 دقائق، ويمكن استخدامه مرة واحدة فقط. إذا لم تطلبه، تجاهل هذه الرسالة.");
        try{sender.send(message);}catch(MailException ex){log.warn("OTP email delivery failed: {}",ex.toString());throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"EMAIL_DELIVERY_FAILED","تعذر إرسال البريد الآن. تحقق من إعدادات SMTP وحاول لاحقًا.");}
    }
}
