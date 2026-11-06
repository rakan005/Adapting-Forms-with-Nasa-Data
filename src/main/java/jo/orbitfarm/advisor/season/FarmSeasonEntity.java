package jo.orbitfarm.advisor.season;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
@Entity @Table(name="farm_season")
public class FarmSeasonEntity {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="farm_id",nullable=false) private Long farmId;
 @Column(name="crop_code",nullable=false,length=40) private String cropCode;
 @Column(name="season_label",nullable=false,length=80) private String seasonLabel;
 @Column(name="planting_date") private LocalDate plantingDate;
 @Column(name="harvest_date") private LocalDate harvestDate;
 @Column(nullable=false,length=20) private String status;
 @Column(name="yield_kg",precision=12,scale=2) private BigDecimal yieldKg;
 @Column(length=1000) private String notes;
 @Column(name="created_at",nullable=false) private Instant createdAt;
 protected FarmSeasonEntity(){}
 public FarmSeasonEntity(Long farmId,String cropCode,String seasonLabel,LocalDate plantingDate,LocalDate harvestDate,String status,BigDecimal yieldKg,String notes){this.farmId=farmId;this.cropCode=cropCode;this.seasonLabel=seasonLabel;this.plantingDate=plantingDate;this.harvestDate=harvestDate;this.status=status;this.yieldKg=yieldKg;this.notes=notes;this.createdAt=Instant.now();}
 public Long getId(){return id;} public Long getFarmId(){return farmId;} public String getCropCode(){return cropCode;} public String getSeasonLabel(){return seasonLabel;} public LocalDate getPlantingDate(){return plantingDate;} public LocalDate getHarvestDate(){return harvestDate;} public String getStatus(){return status;} public BigDecimal getYieldKg(){return yieldKg;} public String getNotes(){return notes;} public Instant getCreatedAt(){return createdAt;}
}
