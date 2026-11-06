package jo.orbitfarm.advisor.alert;
import jakarta.persistence.*;import java.time.Instant;
@Entity @Table(name="alert_preference") public class AlertPreferenceEntity{
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;@Column(name="farmer_id",nullable=false,unique=true)private Long farmerId;@Column(name="in_app_enabled",nullable=false)private boolean inAppEnabled;@Column(name="weather_enabled",nullable=false)private boolean weatherEnabled;@Column(name="created_at",nullable=false)private Instant createdAt;@Column(name="updated_at",nullable=false)private Instant updatedAt;
 protected AlertPreferenceEntity(){}public AlertPreferenceEntity(Long farmerId){this.farmerId=farmerId;this.inAppEnabled=true;this.weatherEnabled=false;this.createdAt=this.updatedAt=Instant.now();}
 public boolean isInAppEnabled(){return inAppEnabled;}public boolean isWeatherEnabled(){return weatherEnabled;}public void update(boolean inApp,boolean weather){inAppEnabled=inApp;weatherEnabled=weather;updatedAt=Instant.now();}
}
