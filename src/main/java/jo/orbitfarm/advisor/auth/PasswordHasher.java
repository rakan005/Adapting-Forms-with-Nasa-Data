package jo.orbitfarm.advisor.auth;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

public final class PasswordHasher {
    private static final int ITERATIONS=310_000, BITS=256;
    private static final SecureRandom RANDOM=new SecureRandom();
    private PasswordHasher(){}
    public static String hash(String password){
        byte[] salt=new byte[16];RANDOM.nextBytes(salt);
        byte[] derived=derive(password.toCharArray(),salt,ITERATIONS);
        return "pbkdf2-sha256$"+ITERATIONS+"$"+Base64.getEncoder().withoutPadding().encodeToString(salt)+"$"+Base64.getEncoder().withoutPadding().encodeToString(derived);
    }
    public static boolean matches(String password,String encoded){
        try{String[] p=encoded.split("\\$",-1);if(p.length!=4||!p[0].equals("pbkdf2-sha256"))return false;int iterations=Integer.parseInt(p[1]);byte[] salt=Base64.getDecoder().decode(p[2]),expected=Base64.getDecoder().decode(p[3]);byte[] actual=derive(password.toCharArray(),salt,iterations);return MessageDigest.isEqual(expected,actual);}catch(RuntimeException e){return false;}
    }
    private static byte[] derive(char[] password,byte[] salt,int iterations){try{PBEKeySpec spec=new PBEKeySpec(password,salt,iterations,BITS);try{return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();}finally{spec.clearPassword();}}catch(Exception e){throw new IllegalStateException("Password hashing is unavailable",e);}}
}
