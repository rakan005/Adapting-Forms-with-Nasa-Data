package jo.orbitfarm.advisor.farm;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FarmRepository extends JpaRepository<FarmEntity, Long> {
    java.util.Optional<FarmEntity> findByIdAndFarmerId(Long id, Long farmerId);
    org.springframework.data.domain.Page<FarmEntity> findAllByFarmerId(Long farmerId, org.springframework.data.domain.Pageable pageable);
    long countByFarmerId(Long farmerId);
}
