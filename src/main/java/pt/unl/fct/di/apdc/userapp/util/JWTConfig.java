package pt.unl.fct.di.apdc.userapp.util;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.ECGenParameterSpec;

import com.auth0.jwt.algorithms.Algorithm;


public class JWTConfig {

    public enum AlgorithmType {
        HS256, HS384, HS512,
        RS256, RS384, RS512,
        ES256, ES384, ES512
    }

    // === CONFIGURATION ===
    public static final AlgorithmType ALGORITHM = AlgorithmType.HS256;
    public static final String HMAC_SECRET = "change-me-to-a-secure-random-string";
    public static final long EXPIRATION_TIME = 1000 * 60 * 60 * 2; // 2 hours

    // === KEYS ===
    private static PrivateKey privateKey;
    private static PublicKey publicKey;

    static {
        try {
            switch (ALGORITHM) {
                case RS256, RS384, RS512 -> {
                    int keySize = switch (ALGORITHM) {
                        case RS256 -> 2048;
                        case RS384 -> 3072;
                        case RS512 -> 4096;
                        default -> throw new IllegalStateException("Unexpected RSA algorithm");
                    };
                    KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
                    kpg.initialize(keySize);
                    KeyPair kp = kpg.generateKeyPair();
                    privateKey = kp.getPrivate();
                    publicKey = kp.getPublic();
                }

                case ES256, ES384, ES512 -> {
                    String curve = switch (ALGORITHM) {
                        case ES256 -> "secp256r1";
                        case ES384 -> "secp384r1";
                        case ES512 -> "secp521r1";
                        default -> throw new IllegalStateException("Unexpected EC algorithm");
                    };
                    KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
                    kpg.initialize(new ECGenParameterSpec(curve));
                    KeyPair kp = kpg.generateKeyPair();
                    privateKey = kp.getPrivate();
                    publicKey = kp.getPublic();
                }

                // HMAC needs no key generation
                case HS256, HS384, HS512 -> {
                    // No-op
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error initializing keys for JWT algorithm: " + ALGORITHM, e);
        }
    }

    // === ALGORITHM FACTORY ===
    public static Algorithm getJWTAlgorithm() {
        return switch (ALGORITHM) {
            case HS256 -> Algorithm.HMAC256(HMAC_SECRET);
            case HS384 -> Algorithm.HMAC384(HMAC_SECRET);
            case HS512 -> Algorithm.HMAC512(HMAC_SECRET);
            case RS256 -> Algorithm.RSA256((RSAPublicKey) publicKey, (RSAPrivateKey) privateKey);
            case RS384 -> Algorithm.RSA384((RSAPublicKey) publicKey, (RSAPrivateKey) privateKey);
            case RS512 -> Algorithm.RSA512((RSAPublicKey) publicKey, (RSAPrivateKey) privateKey);
            case ES256 -> Algorithm.ECDSA256((ECPublicKey) publicKey, (ECPrivateKey) privateKey);
            case ES384 -> Algorithm.ECDSA384((ECPublicKey) publicKey, (ECPrivateKey) privateKey);
            case ES512 -> Algorithm.ECDSA512((ECPublicKey) publicKey, (ECPrivateKey) privateKey);
        };
    }

    // === Optional functions ===
    public static PrivateKey getPrivateKey() {
        return privateKey;
    }

    public static PublicKey getPublicKey() {
        return publicKey;
    }
}
