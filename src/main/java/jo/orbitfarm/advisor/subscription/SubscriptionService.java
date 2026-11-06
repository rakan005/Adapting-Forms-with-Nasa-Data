package jo.orbitfarm.advisor.subscription;

import jo.orbitfarm.advisor.api.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class SubscriptionService {
 private final SubscriptionRepository subscriptions;
 private static final Map<String,Plan> PLANS=Map.of(
  "FREE",new Plan("FREE","أساس",null,1,10,false,false,true,List.of("أرض واحدة","عرض آخر 10 توصيات","تقرير أساسي")),
  "GROWER",new Plan("GROWER","مزارع",null,3,500,true,true,true,List.of("حتى 3 أراضٍ","سجل مواسم كامل","تنبيهات داخل التطبيق","تقارير قابلة للطباعة","مساعد AI عند تفعيله")),
  "PRO",new Plan("PRO","احترافي",null,20,5000,true,true,true,List.of("حتى 20 أرضًا","سجل مواسم كامل","تنبيهات داخل التطبيق","تقارير قابلة للطباعة","مساعد AI عند تفعيله")));
 public SubscriptionService(SubscriptionRepository subscriptions){this.subscriptions=subscriptions;}
 @Transactional public void ensureFreeSubscription(Long farmerId){if(subscriptions.findFirstByFarmerIdOrderByCreatedAtDesc(farmerId).isEmpty())subscriptions.save(new SubscriptionEntity(farmerId,"FREE","ACTIVE"));}
 public List<Plan> plans(){return List.of(PLANS.get("FREE"),PLANS.get("GROWER"),PLANS.get("PRO"));}
 public Plan requirePlan(String code){Plan p=PLANS.get(code==null?"":code.toUpperCase());if(p==null)throw new ApiException(HttpStatus.BAD_REQUEST,"UNKNOWN_PLAN","خطة الاشتراك غير معروفة.");return p;}
 @Transactional(readOnly=true) public SubscriptionView current(Long farmerId){SubscriptionEntity row=subscriptions.findFirstByFarmerIdOrderByCreatedAtDesc(farmerId).orElse(null);if(row==null)return new SubscriptionView("FREE","ACTIVE","MONTHLY",null,null,PLANS.get("FREE"),false,"الخطة الأساسية فعالة.");Plan selected=requirePlan(row.getPlanCode());boolean expired=row.getCurrentPeriodEnd()!=null&&row.getCurrentPeriodEnd().isBefore(Instant.now());Plan effective="ACTIVE".equals(row.getStatus())&&!expired?selected:PLANS.get("FREE");String status=expired?"EXPIRED":row.getStatus();return new SubscriptionView(row.getPlanCode(),status,row.getBillingPeriod(),row.getStartedAt(),row.getCurrentPeriodEnd(),effective,"PENDING_PAYMENT".equals(status),"PENDING_PAYMENT".equals(status)?"بانتظار تفعيل الدفع؛ ستبقى ميزات الخطة الأساسية متاحة.":expired?"انتهت مدة الاشتراك؛ عادت الميزات إلى الخطة الأساسية.":"الاشتراك الشهري فعّال.");}
 @Transactional public SubscriptionView select(Long farmerId,String planCode){Plan plan=requirePlan(planCode);String status="FREE".equals(plan.code())?"ACTIVE":"PENDING_PAYMENT";SubscriptionEntity row=subscriptions.save(new SubscriptionEntity(farmerId,plan.code(),status));Plan effective="ACTIVE".equals(status)?plan:PLANS.get("FREE");return new SubscriptionView(row.getPlanCode(),row.getStatus(),row.getBillingPeriod(),row.getStartedAt(),row.getCurrentPeriodEnd(),effective,"PENDING_PAYMENT".equals(status),"PENDING_PAYMENT".equals(status)?"الدفع الإلكتروني لم يُربط بعد. لن تُخصم أي مبالغ.":"تم تفعيل الخطة الأساسية.");}
 public Plan effectivePlan(Long farmerId){SubscriptionEntity row=subscriptions.findFirstByFarmerIdOrderByCreatedAtDesc(farmerId).orElse(null);if(row==null||!"ACTIVE".equals(row.getStatus())||(row.getCurrentPeriodEnd()!=null&&row.getCurrentPeriodEnd().isBefore(Instant.now())))return PLANS.get("FREE");return requirePlan(row.getPlanCode());}
 public record Plan(String code,String name,BigDecimal monthlyPriceJod,int maxFarms,int decisionHistoryLimit,boolean aiAssistant,boolean alerts,boolean reports,List<String> features){public boolean priceToBeSet(){return monthlyPriceJod==null;}}
 public record SubscriptionView(String selectedPlan,String status,String billingPeriod,Instant startedAt,Instant currentPeriodEnd,Plan effectivePlan,boolean paymentRequired,String message){}
}
