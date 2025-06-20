package pt.unl.fct.di.apdc.userapp.resources;

import java.util.logging.Level;
import java.util.logging.Logger;

import org.apache.commons.codec.digest.DigestUtils;

import com.google.cloud.Timestamp;
import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.DatastoreException;
import com.google.cloud.datastore.DatastoreOptions;
import com.google.cloud.datastore.Entity;
import com.google.cloud.datastore.Key;
import com.google.cloud.datastore.Transaction;
import com.google.gson.Gson;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;
import pt.unl.fct.di.apdc.userapp.util.AccountData;
import pt.unl.fct.di.apdc.userapp.util.Roles;

@Path("/register")
public class RegisterResource {

    private static final Logger LOG = Logger.getLogger(RegisterResource.class.getName());
    private static final Datastore datastore = DatastoreOptions.getDefaultInstance().getService();
    private final Gson g = new Gson();

    @POST
    @Path("/newaccount")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response registerNewUser(AccountData data) {
        LOG.fine("Attempt to register user: " + data.username);

        if (!data.validRegistration() || !Roles.isValidRole(data.role)) {
            return Response.status(Status.BAD_REQUEST).entity("Dados obrigatórios em falta ou role inválido.").build();
        }

        Transaction txn = datastore.newTransaction();
        try {
            Key userKey = datastore.newKeyFactory().setKind("User").newKey(data.username);
            Entity user = txn.get(userKey);

            if (user != null) {
                txn.rollback();
                return Response.status(Status.CONFLICT).entity("Utilizador já existe.").build();
            }

            Entity.Builder userBuilder = Entity.newBuilder(userKey)
                .set("user_pwd", DigestUtils.sha512Hex(data.password))
                .set("user_name", data.name)
                .set("user_email", data.email)
                .set("user_phone1", data.telephone)
                .set("user_profile", Roles.is(data.role, Roles.RU) && data.profile.equalsIgnoreCase("PUBLICO") ? "PUBLICO" : "PRIVADO")
                .set("user_role", data.role.toUpperCase())
                .set("user_account_state", "INATIVO")
                .set("user_creation_time", Timestamp.now())
                .set("user_address", data.address != null ? data.address : "")
                .set("user_postal_code", data.postal_code != null ? data.postal_code : "")
                .set("user_nif", data.nif != null ? data.nif : "")
                .set("user_cc", data.cc != null ? data.cc : "")
                .set("user_cc_issue_date", data.cc_issue_date != null ? data.cc_issue_date : "")
                .set("user_cc_issue_place", data.cc_issue_place != null ? data.cc_issue_place : "")
                .set("user_cc_validity", data.cc_validity != null ? data.cc_validity : "")
                .set("user_birth_date", data.birth_date != null ? data.birth_date : "")
                .set("user_nationality", data.nationality != null ? data.nationality : "")
                .set("user_residence_country", data.residence_country != null ? data.residence_country : "")
                .set("user_photo_url", data.photo_url != null ? data.photo_url : "")
                .set("user_employer", data.employer != null ? data.employer : "")
                .set("user_job", data.job != null ? data.job : "")
                .set("user_company_nif", data.company_nif != null ? data.company_nif : "");

            txn.put(userBuilder.build());
            txn.commit();
            LOG.info("Conta registada com sucesso: " + data.username);
            return Response.ok().build();

        } catch (DatastoreException e) {
            LOG.log(Level.SEVERE, e.toString());
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity("Erro no registo da conta.").build();
        } finally {
            if (txn.isActive()) {
                txn.rollback();
            }
        }
    }
}
