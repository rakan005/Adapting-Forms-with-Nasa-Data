package jo.orbitfarm.advisor.season;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface FarmSeasonRepository extends JpaRepository<FarmSeasonEntity,Long>{List<FarmSeasonEntity> findAllByFarmIdOrderByPlantingDateDesc(Long farmId); long countByFarmId(Long farmId);}
