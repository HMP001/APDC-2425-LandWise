package pt.unl.fct.di.apdc.userapp.resources;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;

import org.apache.commons.codec.digest.DigestUtils;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.DatastoreOptions;
import com.google.cloud.datastore.Entity;
import com.google.cloud.datastore.Key;
import com.google.cloud.datastore.PathElement;
import com.google.cloud.datastore.Query;
import com.google.cloud.datastore.QueryResults;
import com.google.cloud.datastore.Transaction;
import com.google.cloud.datastore.Value;
import com.google.gson.Gson;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Cookie;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;
import pt.unl.fct.di.apdc.userapp.util.ChangeAttributes;
import pt.unl.fct.di.apdc.userapp.util.ChangePassword;
import pt.unl.fct.di.apdc.userapp.util.ChangeRole;
import pt.unl.fct.di.apdc.userapp.util.ChangeState;
import pt.unl.fct.di.apdc.userapp.util.JWTToken;
import pt.unl.fct.di.apdc.userapp.util.RemoveAccount;
import pt.unl.fct.di.apdc.userapp.util.Roles;



@Path("/utils")
@Produces(MediaType.APPLICATION_JSON + ";charset=utf-8") 
public class ComputationResource {

	private static final Logger LOG = Logger.getLogger(ComputationResource.class.getName()); 
	private final Gson g = new Gson();
	public ComputationResource() {} //nothing to be done here @GET
	private static final Datastore datastore = DatastoreOptions.getDefaultInstance().getService();

    private String extractJWT(Cookie cookie, String authHeader) {
        if (cookie != null && cookie.getValue() != null)
            return cookie.getValue();
    
        if (authHeader != null && authHeader.startsWith("Bearer "))
            return authHeader.substring("Bearer ".length());
    
        return null;
    }
    
    @GET
    @Path("/view/{username}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response viewUser(@PathParam("username") String targetUsername,
                             @CookieParam("session::apdc") Cookie cookie,
                             @HeaderParam("Authorization") String authHeader) {
    
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Invalid or expired session.\"}").build();
        }
    
        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Failed to decode token.\"}").build();
        }
    
        String requesterUsername = jwt.getSubject();
        String requesterRole = jwt.getClaim("role").asString();
    
        if (!Roles.isValidRole(requesterRole)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("{\"message\":\"Invalid role.\"}").build();
        }
    
        if (targetUsername == null || targetUsername.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"message\":\"Missing target username.\"}").build();
        }
    
        Key userKey = datastore.newKeyFactory().setKind("User").newKey(targetUsername);
        Entity user = datastore.get(userKey);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"message\":\"User not found.\"}").build();
        }
    
        String targetRole = user.getString("user_role");
        String targetState = user.getString("user_account_state");
        String targetProfile = user.contains("user_profile") ? user.getString("user_profile") : "";
    
        if (Roles.is(requesterRole, Roles.RU, Roles.VU)) {
            if (!"ATIVADO".equalsIgnoreCase(targetState) ||
                !"PUBLICO".equalsIgnoreCase(targetProfile) ||
                !Roles.is(targetRole, Roles.RU)) {
                return Response.status(Response.Status.FORBIDDEN)
                        .entity("{\"message\":\"You do not have permission to view this user.\"}").build();
            }
        } else if (Roles.is(requesterRole, Roles.ADLU, Roles.PO, Roles.PRBO)) {
            if (!Roles.is(targetRole, Roles.RU, Roles.VU)) {
                return Response.status(Response.Status.FORBIDDEN)
                        .entity("{\"message\":\"You do not have permission to view this user.\"}").build();
            }
        }
    
        Map<String, Object> filteredData = entityToMap(user, requesterRole);
        return Response.ok(g.toJson(filteredData)).build();
    }
    

    
    @GET
    @Path("/list")
    @Produces(MediaType.APPLICATION_JSON)
    public Response listUsers(@CookieParam("session::apdc") Cookie cookie,
                            @HeaderParam("Authorization") String authHeader) {
        
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return Response.status(Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Invalid or expired session.\"}")
                    .build();
        }

        DecodedJWT jwt = JWTToken.extractJWT(token);
        String username = jwt.getSubject();
        String role = jwt.getClaim("role").asString();
        LOG.fine("Attempt to list all users for user: " + username);

        if (!Roles.isValidRole(role)) {
            return Response.status(Status.FORBIDDEN)
                    .entity("{\"message\":\"Invalid role.\"}")
                    .build();
        }

        Query<Entity> query = Query.newEntityQueryBuilder().setKind("User").build();
        QueryResults<Entity> results = datastore.run(query);
        Map<String, Map<String, Object>> allUsers = new HashMap<>();

        while (results.hasNext()) {
            Entity user = results.next();

            String userRole = user.contains("user_role") ? user.getString("user_role") : "";
            String userState = user.contains("user_account_state") ? user.getString("user_account_state") : "";
            String userProfile = user.contains("user_profile") ? user.getString("user_profile") : "";

            if (Roles.is(role, Roles.RU, Roles.VU)) {
                if (!userRole.equals(Roles.RU) || !userState.equals("ATIVADO") || !userProfile.equals("PUBLICO")) {
                    continue;
                }
            } else if (Roles.is(role, Roles.ADLU, Roles.PRBO, Roles.PO)) {
                if (!Roles.is(userRole, Roles.RU, Roles.VU)) {
                    continue;
                }
            } else if (!Roles.is(role, Roles.SYSADMIN, Roles.SYSBO, Roles.SGVBO, Roles.SDVBO, Roles.SMBO)) {
                return Response.status(Status.FORBIDDEN)
                        .entity("{\"message\":\"Role not authorized to list users.\"}")
                        .build();
            }

            Map<String, Object> userData = entityToMap(user, role);
            allUsers.put(user.getKey().getName(), userData);
        }

        return Response.ok(g.toJson(allUsers)).build();
    }


    private Map<String, Object> entityToMap(Entity entity, String requesterRole) {
        Map<String, Object> map = new HashMap<>();
        map.put("username", entity.getKey().getName());

        for (String name : entity.getNames()) {
            if (Roles.is(requesterRole, Roles.RU, Roles.VU)) {
                if (!name.equals("user_email") && !name.equals("user_name")) {
                    continue;
                }
            }
            Value<?> value = entity.getValue(name);
            Object fieldValue = (value != null) ? value.get() : "NOT DEFINED";
            map.put(name, fieldValue);
        }

        return map;
    }


	@POST
    @Path("/changerole")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response changeRole(ChangeRole request,
                            @CookieParam("session::apdc") Cookie cookie,
                            @HeaderParam("Authorization") String authHeader) {

        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return Response.status(Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Token is expired. Please login again.\"}")
                    .build();
        }

        String userTarget = request.targetUsername;
        String newRole = request.newRole;
        DecodedJWT jwt = JWTToken.extractJWT(token);
        String username = jwt.getSubject();
        String role = jwt.getClaim("role").asString();

        LOG.fine("Attempt to modify the role for user: " + username);

        if (!Roles.isValidRole(newRole)) {
            return Response.status(Status.BAD_REQUEST)
                    .entity("{\"message\":\"Invalid new role.\"}")
                    .build();
        }

        Key logoutKey = datastore.newKeyFactory()
                .addAncestor(PathElement.of("User", username))
                .setKind("RevokedToken")
                .newKey(token);
        Entity existingRevokedToken = datastore.get(logoutKey);
        if (existingRevokedToken != null) {
            return Response.status(Status.BAD_REQUEST)
                    .entity("{\"message\":\"Token already revoked.\"}")
                    .build();
        }

        if (Roles.is(role, Roles.RU, Roles.VU, Roles.ADLU, Roles.PO, Roles.PRBO)) {
            return Response.status(Status.FORBIDDEN)
                    .entity("{\"message\":\"Permission denied.\"}")
                    .build();
        }

        Key userKey = datastore.newKeyFactory().setKind("User").newKey(userTarget);
        Entity targetUser = datastore.get(userKey);

        if (targetUser == null) {
            return Response.status(Status.NOT_FOUND)
                    .entity("{\"message\":\"Target user not found.\"}")
                    .build();
        }

        String currentRole = targetUser.getString("user_role");

        if (Roles.is(role, Roles.SGVBO)) {
            if (!Roles.is(currentRole, Roles.RU, Roles.VU, Roles.ADLU) ||
                !Roles.is(newRole, Roles.RU, Roles.VU, Roles.ADLU)) {
                return Response.status(Status.FORBIDDEN)
                        .entity("{\"message\":\"SGVBO can only change roles among RU, VU, ADLU.\"}")
                        .build();
            }
        } else if (!Roles.is(role, Roles.SYSADMIN, Roles.SYSBO, Roles.SDVBO, Roles.SMBO)) {
            return Response.status(Status.FORBIDDEN)
                    .entity("{\"message\":\"Only SYS or SD/SM BO can change other roles.\"}")
                    .build();
        }

        Entity updatedUser = Entity.newBuilder(targetUser)
                .set("user_role", newRole)
                .build();
        datastore.put(updatedUser);

        return Response.ok("{\"message\":\"Role updated successfully.\"}").build();
    }



	@POST
    @Path("/changestate")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response changeAccountState(ChangeState request,
                                    @CookieParam("session::apdc") Cookie cookie,
                                    @HeaderParam("Authorization") String authHeader) {

        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return Response.status(Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Invalid or expired session.\"}").build();
        }

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) {
            return Response.status(Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Failed to decode token.\"}").build();
        }

        String username = jwt.getSubject();
        String role = jwt.getClaim("role").asString();
        String userTarget = request.targetUsername;
        String newState = request.account_state;

        LOG.fine("Attempt to modify account state for user: " + username);

        Key logoutKey = datastore.newKeyFactory()
                .addAncestor(PathElement.of("User", username))
                .setKind("RevokedToken")
                .newKey(token);
        if (datastore.get(logoutKey) != null) {
            return Response.status(Status.BAD_REQUEST)
                    .entity("{\"message\":\"Token revoked.\"}").build();
        }

        if (!Roles.is(role, Roles.SYSADMIN, Roles.SYSBO, Roles.SGVBO, Roles.SDVBO, Roles.SMBO)) {
            return Response.status(Status.FORBIDDEN)
                    .entity("{\"message\":\"Permission denied.\"}").build();
        }

        if (!newState.equals("ATIVADO") && !newState.equals("INATIVO") &&
            !newState.equals("SUSPENSO") && !newState.equals("P-REMOVER")) {
            return Response.status(Status.BAD_REQUEST)
                    .entity("{\"message\":\"Invalid state.\"}").build();
        }

        Key userKey = datastore.newKeyFactory().setKind("User").newKey(userTarget);
        Entity user = datastore.get(userKey);
        if (user == null) {
            return Response.status(Status.NOT_FOUND)
                    .entity("{\"message\":\"User not found.\"}").build();
        }

        String userRole = user.getString("user_role").toUpperCase();

        if (Roles.is(role, Roles.SGVBO)) {
            if (!Roles.is(userRole, Roles.RU, Roles.VU, Roles.ADLU)) {
                return Response.status(Status.FORBIDDEN)
                        .entity("{\"message\":\"SGVBO can only change state of RU, VU, ADLU users.\"}").build();
            }
        }

        if (newState.equals("ATIVADO")) {
            String[] requiredFields = {
                "user_email", "user_name", "user_pwd", "user_phone1", "user_nif", "user_cc",
                "user_cc_issue_date", "user_cc_issue_place", "user_cc_validity", "user_birth_date",
                "user_nationality", "user_residence_country", "user_address", "user_postal_code"
            };

            for (String field : requiredFields) {
                if (!user.contains(field) || user.getString(field).isBlank()) {
                    LOG.warning("Activating user '" + userTarget + "' with missing or blank field: " + field);
                }
            }
        }

        Entity updated = Entity.newBuilder(user)
                .set("user_account_state", newState)
                .build();
        datastore.put(updated);

        LOG.info("User " + userTarget + " state changed to " + newState);
        return Response.ok("{\"message\":\"State changed successfully.\"}").build();
    }



	@POST
    @Path("/removeaccount")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response removeAccount(RemoveAccount request,
                                @CookieParam("session::apdc") Cookie cookie,
                                @HeaderParam("Authorization") String authHeader) {
        if (request == null || request.targetUsername == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"message\":\"Missing target username.\"}").build();
        }

        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Invalid or expired session.\"}").build();
        }

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Failed to decode token.\"}").build();
        }

        String username = jwt.getSubject();
        String role = jwt.getClaim("role").asString();
        String userTarget = request.targetUsername;

        LOG.fine("Attempt to remove the account for user: " + username);

        Key logoutKey = datastore.newKeyFactory()
                .addAncestor(PathElement.of("User", username))
                .setKind("RevokedToken")
                .newKey(token);
        if (datastore.get(logoutKey) != null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"message\":\"Token revoked.\"}").build();
        }

        Key userKey = datastore.newKeyFactory().setKind("User").newKey(userTarget);
        Entity targetUser = datastore.get(userKey);

        if (targetUser == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"message\":\"Target user not found.\"}").build();
        }

        String targetRole = targetUser.getString("user_role").toUpperCase();

        // Role restrictions
        if (Roles.is(role, Roles.RU, Roles.VU, Roles.PO, Roles.PRBO, Roles.ADLU)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("{\"message\":\"You are not allowed to remove accounts.\"}").build();
        }

        if (Roles.is(role, Roles.SGVBO)) {
            if (!Roles.is(targetRole, Roles.RU, Roles.VU, Roles.ADLU)) {
                return Response.status(Response.Status.FORBIDDEN)
                        .entity("{\"message\":\"SGVBO can only remove RU, VU, ADLU accounts.\"}").build();
            }
        }

        datastore.delete(userKey);
        LOG.info("User " + userTarget + " removed by " + username);
        return Response.ok("{\"message\":\"User " + userTarget + " successfully removed.\"}").build();
    }


	@POST
    @Path("/changeattributes")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    public Response changeAttributes(ChangeAttributes request,
                                    @CookieParam("session::apdc") Cookie cookie,
                                    @HeaderParam("Authorization") String authHeader) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Invalid or expired session.\"}").build();
        }

        DecodedJWT jwt = JWTToken.extractJWT(token);
        String username = jwt.getSubject();
        String role = jwt.getClaim("role").asString();

        String userTarget = request.targetUsername;
        Map<String, String> newAttributes = request.attributes;

        LOG.fine("Attempt to modify the attributes for user: " + username);

        Key logoutKey = datastore.newKeyFactory()
                .addAncestor(PathElement.of("User", username))
                .setKind("RevokedToken")
                .newKey(token);
        if (datastore.get(logoutKey) != null) {
            return Response.status(Status.BAD_REQUEST)
                    .entity("{\"message\":\"Token revoked.\"}").build();
        }

        Key targetKey = datastore.newKeyFactory().setKind("User").newKey(userTarget);
        Entity targetUser = datastore.get(targetKey);
        if (targetUser == null) {
            return Response.status(Status.NOT_FOUND)
                    .entity("{\"message\":\"Target user not found.\"}").build();
        }

        String targetRole = targetUser.getString("user_role").toUpperCase();

        if (Roles.is(role, Roles.RU, Roles.VU, Roles.PO, Roles.PRBO)) {
            return Response.status(Status.FORBIDDEN)
                    .entity("{\"message\":\"Role not authorized to modify attributes.\"}").build();
        }

        if (Roles.is(role, Roles.ADLU)) {
            if (!username.equals(userTarget)) {
                return Response.status(Status.FORBIDDEN)
                        .entity("{\"message\":\"You can only modify your own account.\"}").build();
            }
            for (String attr : newAttributes.keySet()) {
                if (Set.of("name", "email", "role", "account_state").contains(attr)) {
                    return Response.status(Status.FORBIDDEN)
                            .entity("{\"message\":\"You cannot modify name, email, role, or account state.\"}").build();
                }
            }
        }

        if (Roles.is(role, Roles.SGVBO)) {
            if (!Roles.is(targetRole, Roles.RU, Roles.VU, Roles.ADLU)) {
                return Response.status(Status.FORBIDDEN)
                        .entity("{\"message\":\"SGVBO can only modify attributes of RU, VU, or ADLU.\"}").build();
            }
            for (String attr : newAttributes.keySet()) {
                if (Set.of("name", "email", "role", "account_state").contains(attr)) {
                    return Response.status(Status.FORBIDDEN)
                            .entity("{\"message\":\"SGVBO cannot modify name, email, role or account state.\"}").build();
                }
            }
        }

        Transaction txn = datastore.newTransaction();
        try {
            Entity.Builder builder = Entity.newBuilder(targetUser);
            for (Map.Entry<String, String> entry : newAttributes.entrySet()) {
                builder.set("user_" + entry.getKey(), entry.getValue());
            }
            datastore.put(builder.build());
            txn.commit();
            LOG.info("Attributes for " + userTarget + " updated by " + username);
            return Response.ok("{\"message\":\"Attributes updated successfully.\"}").build();
        } catch (Exception e) {
            txn.rollback();
            return Response.status(Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"message\":\"Error updating attributes: " + e.getMessage() + "\"}").build();
        } finally {
            if (txn.isActive()) txn.rollback();
        }
    }


    @POST
    @Path("/changepassword")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response changePassword(ChangePassword request,
                                   @CookieParam("session::apdc") Cookie cookie,
                                   @HeaderParam("Authorization") String authHeader) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return Response.status(Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Invalid or expired session.\"}").build();
        }
    
        DecodedJWT jwt = JWTToken.extractJWT(token);
        String username = jwt.getSubject();
    
        String password = request.currentPassword;
        String newPassword = request.newPassword;
        String confirmPassword = request.confirmPassword;
    
        LOG.fine("Attempt to change password for user: " + username);
    
        Key logoutKey = datastore.newKeyFactory()
                .addAncestor(PathElement.of("User", username))
                .setKind("RevokedToken")
                .newKey(token);
        if (datastore.get(logoutKey) != null) {
            return Response.status(Status.BAD_REQUEST)
                    .entity("{\"message\":\"Token revoked.\"}").build();
        }
    
        if (!newPassword.equals(confirmPassword)) {
            return Response.status(Status.BAD_REQUEST)
                    .entity("{\"message\":\"New password and confirmation do not match.\"}").build();
        }
    
        Key userKey = datastore.newKeyFactory().setKind("User").newKey(username);
        Entity user = datastore.get(userKey);
        if (user == null) {
            return Response.status(Status.NOT_FOUND)
                    .entity("{\"message\":\"User not found.\"}").build();
        }
    
        String currentHashed = DigestUtils.sha512Hex(password);
        if (!user.getString("user_pwd").equals(currentHashed)) {
            return Response.status(Status.FORBIDDEN)
                    .entity("{\"message\":\"Current password is incorrect.\"}").build();
        }
    
        Entity updatedUser = Entity.newBuilder(user)
                .set("user_pwd", DigestUtils.sha512Hex(newPassword))
                .build();
        datastore.put(updatedUser);
    
        return Response.ok("{\"message\":\"Password changed successfully.\"}").build();
    }
    
    @POST
    @Path("/deleteaccount")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    public Response deleteAccountRequest(RemoveAccount request,
                                        @CookieParam("session::apdc") Cookie cookie,
                                        @HeaderParam("Authorization") String authHeader) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return Response.status(Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Invalid or expired session.\"}").build();
        }

        DecodedJWT jwt = JWTToken.extractJWT(token);
        String username = jwt.getSubject();

        String userTarget = request.targetUsername;
        String newState = "P-REMOVER";

        LOG.fine("Request to delete own account state for user: " + username);

        Key logoutKey = datastore.newKeyFactory()
                .addAncestor(PathElement.of("User", username))
                .setKind("RevokedToken")
                .newKey(token);
        if (datastore.get(logoutKey) != null) {
            return Response.status(Status.BAD_REQUEST)
                    .entity("{\"message\":\"Token revoked.\"}").build();
        }

        if (!username.equals(userTarget)) {
            return Response.status(Status.FORBIDDEN)
                    .entity("{\"message\":\"You can only request deletion of your own account.\"}").build();
        }

        Key userKey = datastore.newKeyFactory().setKind("User").newKey(userTarget);
        Entity user = datastore.get(userKey);

        if (user == null) {
            return Response.status(Status.NOT_FOUND)
                    .entity("{\"message\":\"User not found.\"}").build();
        }

        Entity updated = Entity.newBuilder(user).set("user_account_state", newState).build();
        datastore.put(updated);

        return Response.ok("{\"message\":\"Account deletion requested successfully.\"}").build();
    }

}	



