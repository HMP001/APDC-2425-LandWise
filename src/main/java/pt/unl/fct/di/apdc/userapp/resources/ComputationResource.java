	package pt.unl.fct.di.apdc.userapp.resources;



	import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

import org.apache.commons.codec.digest.DigestUtils;

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
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;
import pt.unl.fct.di.apdc.userapp.util.ChangeAttributes;
import pt.unl.fct.di.apdc.userapp.util.ChangePassword;
import pt.unl.fct.di.apdc.userapp.util.ChangeRole;
import pt.unl.fct.di.apdc.userapp.util.ChangeState;
import pt.unl.fct.di.apdc.userapp.util.RemoveAccount;
import pt.unl.fct.di.apdc.userapp.util.TokenAuth;



	@Path("/utils")
	@Produces(MediaType.APPLICATION_JSON + ";charset=utf-8") 
	public class ComputationResource {

		private static final Logger LOG = Logger.getLogger(ComputationResource.class.getName()); 
		private final Gson g = new Gson();
		public ComputationResource() {} //nothing to be done here @GET
		private static final Datastore datastore = DatastoreOptions.getDefaultInstance().getService();

		@POST
		@Path("/list")
		@Produces(MediaType.APPLICATION_JSON)
		public Response listUsers(TokenAuth token) {


			LOG.fine("Attempt to list all users for user: " + token.username);

			// Step 1: Validate token expiration
			long now = System.currentTimeMillis();
			if (now > token.validateTo) {
				LOG.warning("Logout failed: token expired for user " + token.username);
				return Response.status(Status.UNAUTHORIZED)
						.entity("{\"message\":\"Token is expired. Please login again.\"}")
						.build();
			}

			Query<Entity> query = Query.newEntityQueryBuilder()
					.setKind("User")
					.build();
		
			QueryResults<Entity> results = datastore.run(query);
		
			Map<String, Map<String, Object>> allUsers = new HashMap<>();
		
			while (results.hasNext()) {
				Entity user = results.next();
		
				String userRole = user.contains("user_role") ? user.getString("user_role") : "";
				String userState = user.contains("user_account_state") ? user.getString("user_account_state") : "";
				String userProfile = user.contains("user_profile") ? user.getString("user_profile") : "";
		
				if ("enduser".equals(token.role)) {
					if (!"enduser".equals(userRole) || !"activated".equals(userState) || !"public".equals(userProfile)) {
						continue;
					}
				} else if ("backoffice".equals(token.role)) {
					if (!"enduser".equals(userRole)) {
						continue;
					}
				} else if (!"admin".equals(token.role)) {
					return Response.status(Status.FORBIDDEN)
							.entity("{\"message\":\"Role not authorized to list users.\"}")
							.build();
				}
		
				Map<String, Object> userData = entityToMap(user, token.role);
				allUsers.put(user.getKey().getName(), userData);
			}
		
			return Response.ok(g.toJson(allUsers)).build();
			}
		
			// Converts Entity to Map<String, Object> with role-based filtering
			private Map<String, Object> entityToMap(Entity entity, String requesterRole) {
				Map<String, Object> map = new HashMap<>();
				map.put("username", entity.getKey().getName());

				for (String name : entity.getNames()) {

					// ENDUSER sees only email and name
					if ("enduser".equals(requesterRole)) {
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
		public Response changeRole(ChangeRole request) {
			
			String userTarget = request.targetUsername;
			String newRole = request.newRole;
			TokenAuth token = request.token;

			LOG.fine("Attempt to modify the role for user: " + token.username);


			// Step 1: Validate token expiration
			long now = System.currentTimeMillis();
			if (now > token.validateTo) {
				LOG.warning("Logout failed: token expired for user " + token.username);
				return Response.status(Status.UNAUTHORIZED)
						.entity("{\"message\":\"Token is expired. Please login again.\"}")
						.build();
			}
			
			// Step 2: Check if the token is valid by looking for it in the datastore
			Key logoutKey = datastore.newKeyFactory()
					.addAncestor(PathElement.of("User", token.username))
					.setKind("RevokedToken")
					.newKey(token.magicnumber);// Using the magic number as the key to mark this token as revoked

			// If the token already exists, it means it's already revoked; in that case, no further action is required.
			Entity existingRevokedToken = datastore.get(logoutKey);
			if (existingRevokedToken != null) {
				return Response.status(Status.BAD_REQUEST)
						.entity("{\"message\":\"Token already revoked.\"}")
						.build();
			}

			// Step 3: Check if is a restrict account
			if ("enduser".equals(token.role)) {
				return Response.status(Response.Status.FORBIDDEN)
						.entity("{\"message\":\"ENDUSER is not allowed to change roles.\"}")
						.build();
			}

			// Step 4: update the role

			Key userKey = datastore.newKeyFactory().setKind("User").newKey(userTarget);
			Entity targetUser  = datastore.get(userKey);
		
			if (targetUser == null) {
				return Response.status(Response.Status.NOT_FOUND)
						.entity("{\"message\":\"The target user not found.\"}")
						.build();
			}

			String currentRole = targetUser.getString("user_role");

			//Backoffice update role
			if ("backoffice".equals(token.role)) {
				boolean isAllowed =
					("enduser".equals(currentRole) && "partner".equals(newRole)) ||
					("partner".equals(currentRole) && "enduser".equals(newRole));

				if (!isAllowed) {
					return Response.status(Response.Status.FORBIDDEN)
						.entity("{\"message\":\"BACKOFFICE can only switch ENDUSER and PARTNER roles.\"}")
						.build();
				}
			}

			// Admin Update role
			Entity updatedUser = Entity.newBuilder(targetUser)
				.set("user_role", newRole)
				.build();
			datastore.put(updatedUser);

			TokenAuth newtoken = new TokenAuth(userTarget, newRole);
			return Response.ok(g.toJson(newtoken)).build();

		}


		@POST
		@Path("/changestate")
		@Consumes(MediaType.APPLICATION_JSON)
		@Produces(MediaType.APPLICATION_JSON)
		public Response changeAccountState(ChangeState request) {

			String userTarget = request.targetUsername;
			String newState = request.account_state;
			TokenAuth token = request.token;

			LOG.fine("Attempt to modify the account state for user: " + token.username);


			// Step 1: Validate token expiration
			long now = System.currentTimeMillis();
			if (now > token.validateTo) {
				LOG.warning("Logout failed: token expired for user " + token.username);
				return Response.status(Status.UNAUTHORIZED)
						.entity("{\"message\":\"Token is expired. Please login again.\"}")
						.build();
			}
			
			// Step 2: Check if the token is valid by looking for it in the datastore
			Key logoutKey = datastore.newKeyFactory()
					.addAncestor(PathElement.of("User", token.username))
					.setKind("RevokedToken")
					.newKey(token.magicnumber);// Using the magic number as the key to mark this token as revoked

			// If the token already exists, it means it's already revoked; in that case, no further action is required.
			Entity existingRevokedToken = datastore.get(logoutKey);
			if (existingRevokedToken != null) {
				return Response.status(Status.BAD_REQUEST)
						.entity("{\"message\":\"Token already revoked.\"}")
						.build();
			}

			// Step 3: Check if is a restrict account
			if ("enduser".equals(token.role) || "partner".equals(token.role)) {
				return Response.status(Response.Status.FORBIDDEN)
						.entity("{\"message\":\"ENDUSER is not allowed to change roles.\"}")
						.build();
			}

			//Step 4: Check if the new state is valid
			if (!newState.equals("activated") && !newState.equals("desactivated")) {
				return Response.status(Response.Status.BAD_REQUEST)
						.entity("{\"message\":\"Invalid account state. Must be 'activated' or 'desactivated'.\"}")
						.build();
			}


			// Step 5: update the role

			Key userKey = datastore.newKeyFactory().setKind("User").newKey(userTarget);
			Entity targetUser  = datastore.get(userKey);
		
			if (targetUser == null) {
				return Response.status(Response.Status.NOT_FOUND)
						.entity("{\"message\":\"The target user not found.\"}")
						.build();
			}

			if(token.role.equals("backoffice") && targetUser.getString("user_account_state").equals("blocked")) {
				return Response.status(Response.Status.FORBIDDEN)
						.entity("{\"message\":\"BACKOFFICE cannot change the state of a blocked account.\"}")
						.build();
			}

			Entity updatedUser = Entity.newBuilder(targetUser)
				.set("user_account_state", newState)
				.build();
			datastore.put(updatedUser);

			return Response.ok("{\"message\":\"Role updated successfully.\"}").build();
		}

		@POST
		@Path("/removeaccount")
		@Consumes(MediaType.APPLICATION_JSON)
		@Produces(MediaType.APPLICATION_JSON)
		public Response removeAccount(RemoveAccount request) {

			String userTarget = request.targetUsername;
			TokenAuth token = request.token;

			LOG.fine("Attempt to remove the account for user: " + token.username);

			// Step 1: Validate token expiration
			long now = System.currentTimeMillis();
			if (now > token.validateTo) {
				LOG.warning("Logout failed: token expired for user " + token.username);
				return Response.status(Status.UNAUTHORIZED)
						.entity("{\"message\":\"Token is expired. Please login again.\"}")
						.build();
			}
			
			// Step 2: Check if the token is valid by looking for it in the datastore
			Key logoutKey = datastore.newKeyFactory()
					.addAncestor(PathElement.of("User", token.username))
					.setKind("RevokedToken")
					.newKey(token.magicnumber);// Using the magic number as the key to mark this token as revoked

			// If the token already exists, it means it's already revoked; in that case, no further action is required.
			Entity existingRevokedToken = datastore.get(logoutKey);
			if (existingRevokedToken != null) {
				return Response.status(Status.BAD_REQUEST)
						.entity("{\"message\":\"Token already revoked.\"}")
						.build();
			}

			// Step 3: Check if is a restrict account
			if ("enduser".equals(token.role)) {
				return Response.status(Response.Status.FORBIDDEN)
						.entity("{\"message\":\"ENDUSER is not allowed to change roles.\"}")
						.build();
			}

			// Step 4: Check if the target user exists
			Key userKey = datastore.newKeyFactory().setKind("User").newKey(userTarget);
			Entity targetUser = datastore.get(userKey);
		
			if (targetUser == null) {
				return Response.status(Response.Status.NOT_FOUND)
						.entity("{\"message\":\"Target user not found.\"}")
						.build();
			}

			String targetRole = targetUser.getString("user_role");

			// Step 5: Check Bakcoffice restrictions
			if ("backoffice".equalsIgnoreCase(token.role)) {
				if (!targetRole.equals("enduser") && !targetRole.equals("partner")) {
					return Response.status(Response.Status.FORBIDDEN)
							.entity("{\"message\":\"BACKOFFICE can only remove ENDUSER or PARTNER accounts.\"}")
							.build();
				}
			}

			// Step 6: Remove the user
			datastore.delete(userKey);
			LOG.info("User " + userTarget + " removed by " + token.username);

			return Response.ok("{\"message\":\"User " + userTarget + " successfully removed.\"}").build();
			
		}
		

		@POST
		@Path("/changeattributes")
		@Produces(MediaType.APPLICATION_JSON)
		public Response changeAttributes(ChangeAttributes request) {
			String userTarget = request.targetUsername;
			Map<String, String> newAttributes = request.attributes;
			TokenAuth token = request.token;
			LOG.fine("Attempt to modify the attributes for user: " + token.username);

			// Step 1: Validate token expiration
			long now = System.currentTimeMillis();
			if (now > token.validateTo) {
				LOG.warning("Logout failed: token expired for user " + token.username);
				return Response.status(Status.UNAUTHORIZED)
						.entity("{\"message\":\"Token is expired. Please login again.\"}")
						.build();
			}
			
			// Step 2: Check if the token is valid by looking for it in the datastore
			Key logoutKey = datastore.newKeyFactory()
					.addAncestor(PathElement.of("User", token.username))
					.setKind("RevokedToken")
					.newKey(token.magicnumber);// Using the magic number as the key to mark this token as revoked

			// If the token already exists, it means it's already revoked; in that case, no further action is required.
			Entity existingRevokedToken = datastore.get(logoutKey);
			if (existingRevokedToken != null) {
				return Response.status(Status.BAD_REQUEST)
						.entity("{\"message\":\"Token already revoked.\"}")
						.build();
			}

			// Step 3: Check if the target user exists
			Key targetKey = datastore.newKeyFactory().setKind("User").newKey(userTarget);
			Entity targetUser = datastore.get(targetKey);

			Key userKey = datastore.newKeyFactory().setKind("User").newKey(token.username);
			Entity backofficeUser = datastore.get(userKey);
		
			if (targetUser == null) {
				return Response.status(Response.Status.NOT_FOUND)
						.entity("{\"message\":\"Target user not found.\"}")
						.build();
			}


			String targetRole = targetUser.getString("user_role");
			String accountState = backofficeUser.getString("user_account_state");

			// Step 4: ENDUSER can modify own attributes but not Username, Email, Name, Role, or State
			if (token.role.equals("enduser")) {
				if (!token.username.equals(userTarget)) {
					return Response.status(Status.FORBIDDEN)
							.entity("{\"message\":\"You can only modify your own account.\"}")
							.build();
				}

				if (!accountState.equals("activated")) {
					return Response.status(Status.FORBIDDEN)
							.entity("{\"message\":\"You must activate your account to modify your own attributes.\"}")
							.build();
				}

				for (Map.Entry<String, String> attribute : newAttributes.entrySet()) {
					if ("user_name".equals(attribute.getKey()) || "user_email".equals(attribute.getKey()) || 
						"user_role".equals(attribute.getKey()) || "user_account_state".equals(attribute.getKey())) {
						return Response.status(Status.FORBIDDEN)
								.entity("{\"message\":\"You cannot modify these attributes: Username, Email, Role, or State.\"}")
								.build();
					}
				}
			}

			// Step 5: BACKOFFICE can modify ENDUSER or PARTNER attributes, but not Username or Email
			else if (token.role.equals("backoffice")) {
				if (!accountState.equals("activated")) {
					return Response.status(Status.FORBIDDEN)
							.entity("{\"message\":\"Your account must be activated to modify other users.\"}")
							.build();
				}
				if (!targetRole.equals("enduser") && !targetRole.equals("partner")) {
					return Response.status(Status.FORBIDDEN)
							.entity("{\"message\":\"You can only modify ENDUSER or PARTNER accounts.\"}")
							.build();
				}
				for (Map.Entry<String, String> attribute : newAttributes.entrySet()) {
					if ("user_name".equals(attribute.getKey()) || "user_email".equals(attribute.getKey())) {
						return Response.status(Status.FORBIDDEN)
								.entity("{\"message\":\"You cannot modify Username or Email for other users.\"}")
								.build();
					}
				}
			}

			else if ("admin".equals(token.role)) {
				LOG.fine("Admin " + token.username + " is modifying user: " + userTarget);
			}

			else {
				return Response.status(Status.FORBIDDEN)
						.entity("{\"message\":\"Role not authorized to modify attributes.\"}")
						.build();
			}

			// Step 5: Apply changes to the target user's attributes
			Transaction txn = datastore.newTransaction();
			try {
				// Apply the modifications based on newAttributes
				Entity.Builder userBuilder = Entity.newBuilder(targetUser); 
				for (Map.Entry<String, String> attribute : newAttributes.entrySet()) {
					userBuilder.set("user_" + attribute.getKey(), attribute.getValue());
				}
				
				targetUser = userBuilder.build();
				txn.put(targetUser);
				txn.commit();
				LOG.info("User attributes updated for " + userTarget);
				return Response.ok("{\"message\":\"User attributes successfully updated.\"}").build();
			} catch (Exception e) {
				txn.rollback();
				return Response.status(Status.INTERNAL_SERVER_ERROR)
						.entity("{\"message\":\"Error updating user attributes: " + e.getMessage() + "\"}")
						.build();
			}

			finally {
				if (txn.isActive()) {
					txn.rollback();
				}
			}
		}


		@POST
		@Path("/changepassword")
		@Consumes(MediaType.APPLICATION_JSON)
		@Produces(MediaType.APPLICATION_JSON)
		public Response changePassword(ChangePassword request){

			String password = request.currentPassword;
			String new_password = request.newPassword;
			String new_password_confirmation = request.confirmPassword;
			TokenAuth token = request.token;
			
			LOG.fine("Attempt to change password for user: " + token.username);

			// Step 1: Validate token expiration
			long now = System.currentTimeMillis();
			if (now > token.validateTo) {
				LOG.warning("Logout failed: token expired for user " + token.username);
				return Response.status(Status.UNAUTHORIZED)
						.entity("{\"message\":\"Token is expired. Please login again.\"}")
						.build();
			}

			// Step 2: Validate pasword
			if (!new_password.equals(new_password_confirmation)) {
				return Response.status(Response.Status.BAD_REQUEST)
						.entity("{\"message\":\"New password and confirmation do not match.\"}")
						.build();
			}	

			// Step 3: Check if the token is valid by looking for it in the datastore
			Key logoutKey = datastore.newKeyFactory()
					.addAncestor(PathElement.of("User", token.username))
					.setKind("RevokedToken")
					.newKey(token.magicnumber);// Using the magic number as the key to mark this token as revoked

			// If the token already exists, it means it's already revoked; in that case, no further action is required.
			Entity existingRevokedToken = datastore.get(logoutKey);
			if (existingRevokedToken != null) {
				return Response.status(Status.BAD_REQUEST)
						.entity("{\"message\":\"Token already revoked.\"}")
						.build();
			}

			Key userKey = datastore.newKeyFactory().setKind("User").newKey(token.username);
			Entity user = datastore.get(userKey);
		
			if (user == null) {
				return Response.status(Response.Status.NOT_FOUND)
						.entity("{\"message\":\"User not found.\"}")
						.build();
			}
			
			// Step 4: Update Password

			String currentHashed = DigestUtils.sha512Hex(password);
			if (!user.getString("user_pwd").equals(currentHashed)) {
				return Response.status(Response.Status.FORBIDDEN)
						.entity("{\"message\":\"Current password is incorrect.\"}")
						.build();
			}
		
			Entity updatedUser = Entity.newBuilder(user)
					.set("user_pwd", DigestUtils.sha512Hex(new_password))
					.build();
			datastore.put(updatedUser);
		
			return Response.ok("{\"message\":\"Password changed successfully.\"}").build();
		}


		@POST
		@Path("/createworksheet")
		@Produces(MediaType.APPLICATION_JSON)
		public Response createWorksheet(){
			return Response.ok("pong").build();
		}

		
	}	



