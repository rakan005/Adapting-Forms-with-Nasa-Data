package jo.orbitfarm.advisor.auth;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.Optional;
public interface AuthSessionRepository extends JpaRepository<AuthSessionEntity,Long>{ Optional<AuthSessionEntity> findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(String tokenHash, Instant now); Optional<AuthSessionEntity> findByTokenHashAndRevokedAtIsNull(String tokenHash); }
