package jo.orbitfarm.advisor.auth;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="auth_session")
public class AuthSessionEntity {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="farmer_id",nullable=false) private Long farmerId;
 @Column(name="token_hash",nullable=false,unique=true,length=64) private String tokenHash;
 @Column(name="expires_at",nullable=false) private Instant expiresAt;
 @Column(name="revoked_at") private Instant revokedAt;
 @Column(name="created_at",nullable=false) private Instant createdAt;
 protected AuthSessionEntity(){}
 public AuthSessionEntity(Long farmerId,String tokenHash,Instant expiresAt){this.farmerId=farmerId;this.tokenHash=tokenHash;this.expiresAt=expiresAt;this.createdAt=Instant.now();}
 public Long getFarmerId(){return farmerId;} public Instant getExpiresAt(){return expiresAt;} public Instant getRevokedAt(){return revokedAt;} public void revoke(){revokedAt=Instant.now();}
}
