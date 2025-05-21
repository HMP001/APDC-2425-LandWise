package pt.unl.fct.di.apdc.userapp.util;

import com.google.cloud.datastore.*;
import org.apache.commons.codec.digest.DigestUtils;
import java.util.logging.Logger;

public class RootInitializer {
    private static final Logger LOG = Logger.getLogger(RootInitializer.class.getName());

    public static void createRootUserIfNotExists(Datastore datastore) {
        String username = "root";
        Key userKey = datastore.newKeyFactory().setKind("User").newKey(username);

        Entity existingUser = datastore.get(userKey);
        if (existingUser != null) {
            LOG.info("[INFO] Utilizador root já existe.");
            return;
        }

        String defaultPassword = "admin123"; // podes ler de variável de ambiente se quiseres mais segurança
        String hashedPassword = DigestUtils.sha512Hex(defaultPassword);

        Entity rootUser = Entity.newBuilder(userKey)
                
                .set("user_email", "root@admin.com")
                .set("user_name", "System Admin")
                .set("user_telephone", "000000000")
                .set("user_pwd", hashedPassword)
                .set("user_profile", "private")
                .set("user_role", "admin")
                .set("user_account_state", "activated")
                .set("user_creation_time", System.currentTimeMillis())
                .build();

        datastore.put(rootUser);
        LOG.info("[SUCCESS] Conta root criada com sucesso.");
    }
}
