package pt.unl.fct.di.apdc.userapp.resources;

import java.io.InputStream;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.apache.commons.codec.digest.DigestUtils;
import org.glassfish.jersey.media.multipart.FormDataContentDisposition;
import org.glassfish.jersey.media.multipart.FormDataParam;

import com.google.cloud.Timestamp;
import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.DatastoreException;
import com.google.cloud.datastore.DatastoreOptions;
import com.google.cloud.datastore.Entity;
import com.google.cloud.datastore.Key;
import com.google.cloud.datastore.Transaction;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
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
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response registerNewUser(
            @FormDataParam("data") String jsonData,
            @FormDataParam("profile_picture") InputStream profilePictureStream,
            @FormDataParam("profile_picture") FormDataContentDisposition fileDetail) {
        AccountData data;
        try {
            data = g.fromJson(jsonData, AccountData.class);
        } catch (Exception e) {
            return Response.status(Status.BAD_REQUEST).entity("Invalid JSON data: " + e.getMessage()).build();
        }
        LOG.log(Level.FINE, "Attempt to register user: {0}", data != null ? data.username : "null");

        if (data == null || !data.validForRegistrationByRole() || !Roles.isValidRole(data.role)) {
            return Response.status(Status.BAD_REQUEST).entity("Dados obrigatórios em falta ou role inválido.").build();
        }

        String photoUrl = "";
        if (profilePictureStream != null && fileDetail != null) {
            try {
                String bucketName = "alien-iterator-460014-a0.appspot.com";
                String fileName = "profile_pictures/" + data.username + "_" + UUID.randomUUID() + "_"
                        + fileDetail.getFileName();
                Storage storage = StorageOptions.getDefaultInstance().getService();
                BlobInfo blobInfo = BlobInfo.newBuilder(bucketName, fileName)
                        .setContentType(fileDetail.getType())
                        .build();
                try (java.nio.channels.WritableByteChannel channel = storage.writer(blobInfo)) {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = profilePictureStream.read(buffer)) != -1) {
                        channel.write(java.nio.ByteBuffer.wrap(buffer, 0, bytesRead));
                    }
                }
                photoUrl = String.format("https://storage.googleapis.com/%s/%s", bucketName, fileName);
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Failed to upload profile picture: {0}", e.getMessage());
                photoUrl = "";
            }
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
                    .set("user_profile",
                            Roles.is(data.role, Roles.RU) && data.profile.equalsIgnoreCase("PUBLICO") ? "PUBLICO"
                                    : "PRIVADO")
                    .set("user_role", data.role.toUpperCase())
                    .set("user_account_state", "INATIVO")
                    .set("user_creation_time", Timestamp.now())
                    .set("user_phone2", data.telephone2 != null ? data.telephone2 : "")
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
                    .set("user_photo_url", photoUrl)
                    .set("user_employer", data.employer != null ? data.employer : "")
                    .set("user_job", data.job != null ? data.job : "")
                    .set("user_company_nif", data.company_nif != null ? data.company_nif : "");

            txn.put(userBuilder.build());
            txn.commit();
            LOG.info("Conta registada com sucesso: " + data.username);
            return Response.ok().entity("OK").build();

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
