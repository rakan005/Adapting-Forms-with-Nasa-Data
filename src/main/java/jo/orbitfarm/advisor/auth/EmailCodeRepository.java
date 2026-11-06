package jo.orbitfarm.advisor.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EmailCodeRepository extends JpaRepository<EmailCodeEntity, Long> {
    Optional<EmailCodeEntity> findFirstByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(String email, String purpose);
    List<EmailCodeEntity> findAllByEmailAndPurposeAndConsumedAtIsNull(String email, String purpose);
}
