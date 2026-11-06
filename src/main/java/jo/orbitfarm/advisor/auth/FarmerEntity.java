package jo.orbitfarm.advisor.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "farmer")
public class FarmerEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "full_name", nullable = false, length = 120) private String fullName;
    @Column(nullable = false, unique = true, length = 254) private String email;
    @Column(length = 30) private String phone;
    @Column(name = "password_hash", length = 512) private String passwordHash;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    protected FarmerEntity() {}
    public FarmerEntity(String fullName, String email, String phone, String passwordHash) { this.fullName=fullName; this.email=email; this.phone=phone; this.passwordHash=passwordHash; }
    @PrePersist void onCreate(){createdAt=Instant.now();}
    public Long getId(){return id;} public String getFullName(){return fullName;} public String getEmail(){return email;} public String getPhone(){return phone;} public String getPasswordHash(){return passwordHash;} public Instant getCreatedAt(){return createdAt;}
}
