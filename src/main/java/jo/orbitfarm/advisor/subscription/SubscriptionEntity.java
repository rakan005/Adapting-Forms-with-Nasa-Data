package jo.orbitfarm.advisor.subscription;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="farmer_subscription")
public class SubscriptionEntity {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="farmer_id",nullable=false) private Long farmerId;
 @Column(name="plan_code",nullable=false,length=24) private String planCode;
 @Column(nullable=false,length=24) private String status;
 @Column(name="billing_period",nullable=false,length=20) private String billingPeriod;
 @Column(name="started_at") private Instant startedAt;
 @Column(name="current_period_end") private Instant currentPeriodEnd;
 @Column(name="created_at",nullable=false) private Instant createdAt;
 @Column(name="updated_at",nullable=false) private Instant updatedAt;
 protected SubscriptionEntity(){}
 public SubscriptionEntity(Long farmerId,String planCode,String status){this.farmerId=farmerId;this.planCode=planCode;this.status=status;this.billingPeriod="MONTHLY";this.createdAt=this.updatedAt=Instant.now();if("ACTIVE".equals(status)){this.startedAt=Instant.now();this.currentPeriodEnd="FREE".equals(planCode)?null:Instant.now().plus(30,java.time.temporal.ChronoUnit.DAYS);}}
 public Long getId(){return id;} public Long getFarmerId(){return farmerId;} public String getPlanCode(){return planCode;} public String getStatus(){return status;} public String getBillingPeriod(){return billingPeriod;} public Instant getStartedAt(){return startedAt;} public Instant getCurrentPeriodEnd(){return currentPeriodEnd;} public Instant getCreatedAt(){return createdAt;}
}
