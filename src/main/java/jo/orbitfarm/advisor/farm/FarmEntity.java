package jo.orbitfarm.advisor.farm;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "farm")
public class FarmEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    @Column(nullable = false, precision = 8, scale = 5)
    private BigDecimal latitude;
    @Column(nullable = false, precision = 8, scale = 5)
    private BigDecimal longitude;
    @Column(name = "elevation_m") private Integer elevationM;
    private String irrigation;
    @Column(name = "salinity_dsm", precision = 8, scale = 3) private BigDecimal salinityDsm;
    @Column(name = "soil_depth") private String soilDepth;
    @Column(name = "previous_crop_code") private String previousCropCode;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected FarmEntity() {}

    public FarmEntity(String name, BigDecimal latitude, BigDecimal longitude, Integer elevationM,
                      String irrigation, BigDecimal salinityDsm, String soilDepth, String previousCropCode) {
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.elevationM = elevationM;
        this.irrigation = irrigation;
        this.salinityDsm = salinityDsm;
        this.soilDepth = soilDepth;
        this.previousCropCode = previousCropCode;
    }

    @PrePersist void onCreate() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
    public Long getId() { return id; }
    public String getName() { return name; }
    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public Integer getElevationM() { return elevationM; }
    public String getIrrigation() { return irrigation; }
    public BigDecimal getSalinityDsm() { return salinityDsm; }
    public String getSoilDepth() { return soilDepth; }
    public String getPreviousCropCode() { return previousCropCode; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void update(String name, BigDecimal latitude, BigDecimal longitude, Integer elevationM,
                       String irrigation, BigDecimal salinityDsm, String soilDepth, String previousCropCode) {
        this.name = name; this.latitude = latitude; this.longitude = longitude; this.elevationM = elevationM;
        this.irrigation = irrigation; this.salinityDsm = salinityDsm; this.soilDepth = soilDepth;
        this.previousCropCode = previousCropCode;
    }
}
