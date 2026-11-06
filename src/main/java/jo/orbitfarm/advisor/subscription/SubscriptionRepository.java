package jo.orbitfarm.advisor.subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface SubscriptionRepository extends JpaRepository<SubscriptionEntity,Long>{Optional<SubscriptionEntity> findFirstByFarmerIdOrderByCreatedAtDesc(Long farmerId);}
