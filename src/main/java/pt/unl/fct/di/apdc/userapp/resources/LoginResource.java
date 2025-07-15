package pt.unl.fct.di.apdc.userapp.resources;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.DatastoreOptions;
import com.google.cloud.datastore.Entity;
import com.google.cloud.datastore.Key;
import com.google.cloud.datastore.KeyFactory;
import com.google.gson.JsonObject;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Cookie;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.NewCookie;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;
import pt.unl.fct.di.apdc.userapp.util.JWTConfig;
import pt.unl.fct.di.apdc.userapp.util.JWTToken;
import pt.unl.fct.di.apdc.userapp.util.LoginData;
import pt.unl.fct.di.apdc.userapp.util.Roles;

@Path("/login")
@Produces(MediaType.APPLICATION_JSON + ";charset=utf-8")
public class LoginResource {

    private static final Logger LOG = Logger.getLogger(LoginResource.class.getName());

    private static final Datastore datastore = DatastoreOptions.getDefaultInstance().getService();
    private static final KeyFactory userKeyFactory = datastore.newKeyFactory().setKind("User");

    @POST
    @Path("/account")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response doLogin(LoginData data) {
        LOG.fine("Login attempt by user: " + data.username);

        try {
            Key userKey = userKeyFactory.newKey(data.username);
            Entity user = datastore.get(userKey);

            if (user == null) {
                LOG.warning("User not found: " + data.username);
                return Response.status(Status.FORBIDDEN).entity("Incorrect username or password.").build();
            }

            String accountState = user.getString("user_account_state");
            LOG.info("Estado da conta de " + data.username + ": " + accountState);
            if (!"ATIVADO".equalsIgnoreCase(accountState)) {
                LOG.warning("Conta não está ativa: " + data.username);
                return Response.status(Status.FORBIDDEN)
                        .entity("{\"message\":\"Conta não está ativa. Aguarde ativação.\"}")
                        .build();
            }

            // Verifica password
            String hashedPWD = user.getString("user_pwd");
            String hashedInput = org.apache.commons.codec.digest.DigestUtils.sha512Hex(data.password);
            if (!hashedPWD.equals(hashedInput)) {
                LOG.warning("Wrong password for: " + data.username);
                return Response.status(Status.FORBIDDEN).entity("Incorrect username or password.").build();
            }

            // Obtem role e valida
            String role = user.getString("user_role");
            LOG.info("Role para " + data.username + ": " + role);
            if (!Roles.isValidRole(role)) {
                LOG.warning("Role inválido para " + data.username + ": " + role);
                return Response.status(Status.FORBIDDEN)
                        .entity("{\"message\":\"Role inválido.\"}")
                        .build();
            }
            
            String foto = user.contains("user_photo") ? user.getString("user_photo") : null;
            String email = user.getString("user_email");

            // Prepara claims JWT
            Map<String, Object> fields = new HashMap<>();
            fields.put("role", role);
            fields.put("username", data.username);
            fields.put("photo", foto != null ? foto : "");
            fields.put("email", email);

            // Cria token JWT
            String token = JWTToken.createJWT(data.username, fields);
            if (token == null) {
                LOG.severe("Failed to create JWT for user: " + data.username);
                return Response.status(Status.INTERNAL_SERVER_ERROR).entity("Failed to create JWT.").build();
            }

            // Cria cookie seguro HTTP-only com o token
            NewCookie cookie = new NewCookie.Builder("session::apdc")
                    .value(token)
                    .path("/")
                    .comment("JWT session token")
                    .maxAge((int) (JWTConfig.EXPIRATION_TIME / 1000))
                    .secure(false) // true em produção com HTTPS
                    .httpOnly(true)
                    .build();
            
            JsonObject responseData = new JsonObject();
            responseData.addProperty("username", data.username);
            responseData.addProperty("role", role);
            responseData.addProperty("photo", foto != null ? foto : "");
            responseData.addProperty("token", token);
            responseData.addProperty("email", email);


            LOG.info("Login successful for user: " + data.username);
            return Response.ok().cookie(cookie).entity(responseData.toString()).build();

        } catch (Exception e) {
            LOG.severe("Error during login: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            e.printStackTrace();
            return Response.status(Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"message\":\"Internal error: " + e.getClass().getSimpleName() + " - " + e.getMessage() + "\"}")
                    .build();
        }
    }

    // Validação simples de permissões por role a partir do cookie JWT
    public static boolean checkPermissions(Cookie cookie, String requiredRole) {
        if (cookie == null || cookie.getValue() == null) {
            return false;
        }

        DecodedJWT jwt = JWTToken.extractJWT(cookie.getValue());
        if (jwt == null || !JWTToken.validateJWT(cookie.getValue())) {
            return false;
        }

        String userRole = jwt.getClaim("role").asString();
        return Roles.is(userRole, requiredRole);
    }
}