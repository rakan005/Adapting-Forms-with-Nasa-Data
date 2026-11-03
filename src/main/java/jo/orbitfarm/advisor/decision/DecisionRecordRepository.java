package jo.orbitfarm.advisor.decision;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DecisionRecordRepository extends JpaRepository<DecisionRecordEntity, Long> {
    Page<DecisionRecordEntity> findByFarmIdOrderByCreatedAtDesc(Long farmId, Pageable pageable);
    void deleteByFarmId(Long farmId);
}
