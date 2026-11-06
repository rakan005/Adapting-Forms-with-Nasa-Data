package jo.orbitfarm.advisor.auth;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface FarmerRepository extends JpaRepository<FarmerEntity,Long>{ Optional<FarmerEntity> findByEmailIgnoreCase(String email); boolean existsByEmailIgnoreCase(String email); }
