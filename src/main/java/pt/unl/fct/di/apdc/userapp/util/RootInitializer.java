package pt.unl.fct.di.apdc.userapp.util;

import java.util.logging.Logger;

import org.apache.commons.codec.digest.DigestUtils;

import com.google.cloud.Timestamp;
import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.Entity;
import com.google.cloud.datastore.Key;

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

        String defaultPassword = "admin123"; // Em produção, usar variável de ambiente ou segredo seguro
        String hashedPassword = DigestUtils.sha512Hex(defaultPassword);

        Entity rootUser = Entity.newBuilder(userKey)
                .set("user_pwd", hashedPassword)
                .set("user_name", "System Admin")
                .set("user_email", "root@admin.com")
                .set("user_phone1", "000000000")
                .set("user_phone2", "111222333")
                .set("user_profile", "PRIVADO")
                .set("user_role", "SYSADMIN")
                .set("user_account_state", "ATIVADO")
                .set("user_creation_time", Timestamp.now())
                .set("user_address", "")
                .set("user_postal_code", "")
                .set("user_nif", "")
                .set("user_cc", "")
                .set("user_cc_issue_date", "")
                .set("user_cc_issue_place", "")
                .set("user_cc_validity", "")
                .set("user_birth_date", "")
                .set("user_nationality", "")
                .set("user_residence_country", "")
                .set("user_photo_url", "")
                .set("user_employer", "")
                .set("user_job", "")
                .set("user_company_nif", "")
                .build();

        datastore.put(rootUser);
        LOG.info("[SUCCESS] Conta root criada com sucesso.");
    }
}
