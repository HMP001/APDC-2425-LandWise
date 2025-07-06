package pt.unl.fct.di.apdc.userapp.util;

import java.util.Date;
import java.util.Map;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTCreator;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.SignatureVerificationException;
import com.auth0.jwt.exceptions.TokenExpiredException;
import com.auth0.jwt.interfaces.DecodedJWT;

public class JWTToken {

    public static String createJWT(String username, Map<String, Object> fields) {
        Algorithm algorithm = JWTConfig.getJWTAlgorithm();
        long now = System.currentTimeMillis();
        long expires = now + JWTConfig.EXPIRATION_TIME;

        JWTCreator.Builder jwtBuilder = JWT.create()
            .withSubject(username)
            .withIssuedAt(new Date(now))
            .withExpiresAt(new Date(expires));
        
        if (fields != null) {
            for (Map.Entry<String, Object> entry : fields.entrySet()) {
                Object value = entry.getValue();
                try {
                    jwtBuilder.withClaim(entry.getKey(), value.toString());
                } catch (Exception e) {
                    System.out.println("Failed to add claim for key: " + entry.getKey() + " due to error: " + e.getMessage());
                }
            }
        }
        return jwtBuilder.sign(algorithm);
    }

    public static boolean validateJWT(String token) {
        try {
            Algorithm algorithm = JWTConfig.getJWTAlgorithm();
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decoded = verifier.verify(token);

            // Manually check expiration
            Date expiresAt = decoded.getExpiresAt();
            return expiresAt == null || expiresAt.after(new Date());

        } catch (SignatureVerificationException e) {
            System.out.println("Invalid signature");
            return false;
        } catch (TokenExpiredException e) {
            System.out.println("Token expired");
            return false;
        } catch (Exception e) {
            System.out.println("Invalid token: " + e.getMessage());
            return false;
        }
    }

    public static DecodedJWT extractJWT(String token) {
        try {
            Algorithm algorithm = JWTConfig.getJWTAlgorithm();
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decoded = verifier.verify(token);

            return decoded;
        } catch (Exception e) {
            return null;
        }
    }
}
