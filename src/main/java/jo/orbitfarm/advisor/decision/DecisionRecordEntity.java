package jo.orbitfarm.advisor.decision;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "decision_record")
public class DecisionRecordEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "farm_id", nullable = false) private Long farmId;
    @Column(name = "decision_date", nullable = false) private LocalDate decisionDate;
    @Column(name = "pack_code") private String packCode;
    @Column(name = "coverage_level", nullable = false) private int coverageLevel;
    @Column(nullable = false) private boolean ranked;
    @Column(nullable = false) private String confidence;
    @Column(name = "farmer_action") private String farmerAction;
    @Column(name = "farmer_crop_code") private String farmerCropCode;
    @Column(name = "farmer_action_at") private Instant farmerActionAt;
    @Lob @Column(name = "response_json", nullable = false) private String responseJson;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected DecisionRecordEntity() {}
    public DecisionRecordEntity(Long farmId, LocalDate decisionDate, String packCode, int coverageLevel,
                                boolean ranked, String confidence, String responseJson) {
        this.farmId = farmId; this.decisionDate = decisionDate; this.packCode = packCode;
        this.coverageLevel = coverageLevel; this.ranked = ranked; this.confidence = confidence;
        this.responseJson = responseJson; this.createdAt = Instant.now();
    }
    public Long getId() { return id; }
    public Long getFarmId() { return farmId; }
    public LocalDate getDecisionDate() { return decisionDate; }
    public String getPackCode() { return packCode; }
    public int getCoverageLevel() { return coverageLevel; }
    public boolean isRanked() { return ranked; }
    public String getConfidence() { return confidence; }
    public String getFarmerAction() { return farmerAction; }
    public String getFarmerCropCode() { return farmerCropCode; }
    public Instant getFarmerActionAt() { return farmerActionAt; }
    public String getResponseJson() { return responseJson; }
    public Instant getCreatedAt() { return createdAt; }
    public void setResponseJson(String responseJson) { this.responseJson = responseJson; }
    public void recordAction(String action, String cropCode) {
        farmerAction = action; farmerCropCode = cropCode; farmerActionAt = Instant.now();
    }
}
