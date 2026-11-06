package jo.orbitfarm.advisor.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "auth_email_code")
public class EmailCodeEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 254) private String email;
    @Column(nullable = false, length = 16) private String purpose;
    @Column(name = "code_hash", nullable = false, length = 64) private String codeHash;
    @Column(name = "full_name", length = 120) private String fullName;
    @Column(length = 30) private String phone;
    @Column(name = "attempt_count", nullable = false) private int attemptCount;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "consumed_at") private Instant consumedAt;

    protected EmailCodeEntity() {}
    public EmailCodeEntity(String email, String purpose, String codeHash, String fullName, String phone, Instant expiresAt) {
        this.email=email; this.purpose=purpose; this.codeHash=codeHash; this.fullName=fullName; this.phone=phone;
        this.createdAt=Instant.now(); this.expiresAt=expiresAt;
    }
    public Long getId(){return id;} public String getEmail(){return email;} public String getPurpose(){return purpose;}
    public String getCodeHash(){return codeHash;} public String getFullName(){return fullName;} public String getPhone(){return phone;}
    public int getAttemptCount(){return attemptCount;} public Instant getCreatedAt(){return createdAt;} public Instant getExpiresAt(){return expiresAt;}
    public boolean isConsumed(){return consumedAt!=null;} public void incrementAttempts(){attemptCount++;} public void consume(){consumedAt=Instant.now();}
}
