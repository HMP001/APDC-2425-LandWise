package pt.unl.fct.di.apdc.userapp.resources;


import java.util.logging.Logger;

import org.apache.commons.codec.digest.DigestUtils;

import com.google.cloud.Timestamp;
import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.DatastoreOptions;
import com.google.cloud.datastore.Entity;
import com.google.cloud.datastore.Key;
import com.google.cloud.datastore.KeyFactory;
import com.google.cloud.datastore.PathElement;
import com.google.gson.Gson;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;
import pt.unl.fct.di.apdc.userapp.util.LoginData;
import pt.unl.fct.di.apdc.userapp.util.TokenAuth;

@Path("/login")
@Produces(MediaType.APPLICATION_JSON + ";charset=utf-8")
public class LoginResource {

	private static final String MESSAGE_INVALID_CREDENTIALS = "Incorrect username or password.";

	private static final String LOG_MESSAGE_LOGIN_ATTEMP = "Login attempt by user: ";
	private static final String LOG_MESSAGE_LOGIN_SUCCESSFUL = "Login successful by user: ";
	private static final String LOG_MESSAGE_WRONG_PASSWORD = "Wrong password for: ";
	private static final String LOG_MESSAGE_UNKNOW_USER = "Failed login attempt for username: ";

	private static final Logger LOG = Logger.getLogger(LoginResource.class.getName());
	private static final Datastore datastore = DatastoreOptions.getDefaultInstance().getService();
	private static final KeyFactory userKeyFactory = datastore.newKeyFactory().setKind("User");

	private final Gson g = new Gson();

	public LoginResource() {

	}

	@POST
	@Path("/account")
	@Consumes(MediaType.APPLICATION_JSON)
	@Produces(MediaType.APPLICATION_JSON)
	public Response accountLogin(LoginData data) {
		LOG.fine(LOG_MESSAGE_LOGIN_ATTEMP + data.username);

		Key userKey = userKeyFactory.newKey(data.username);

		Entity user = datastore.get(userKey);
		if (user != null) {
			String hashedPWD = user.getString("user_pwd");
			if (hashedPWD.equals(DigestUtils.sha512Hex(data.password))) {
				
				LOG.info(LOG_MESSAGE_LOGIN_SUCCESSFUL + data.username);
				String role = user.getString("user_role");
				TokenAuth token = new TokenAuth(data.username, role);
				KeyFactory logKeyFactory = datastore.newKeyFactory()
						.addAncestor(PathElement.of("User", data.username))
						.setKind("UserLog");
				Key logKey = logKeyFactory.newKey(token.magicnumber);
				Entity userLog = Entity.newBuilder(logKey)
						.set("user_login_time", Timestamp.now())
						.set("user_magic_number", token.magicnumber)
						.set("validate_from", Timestamp.ofTimeSecondsAndNanos(token.validateFrom / 1000, 0))
						.set("validate_to", Timestamp.ofTimeSecondsAndNanos(token.validateTo / 1000, 0))
						.build();
				datastore.put(userLog);
				return Response.ok(g.toJson(token)).build();
			} else {
				LOG.warning(LOG_MESSAGE_WRONG_PASSWORD + data.username);
				return Response.status(Status.FORBIDDEN)
						.entity(MESSAGE_INVALID_CREDENTIALS)
						.build();
			}
		} else {
			LOG.warning(LOG_MESSAGE_UNKNOW_USER + data.username);
			return Response.status(Status.FORBIDDEN)
					.entity(MESSAGE_INVALID_CREDENTIALS)
					.build();
		}
	}

	@POST
	@Path("/logout")
	@Consumes(MediaType.APPLICATION_JSON)
	@Produces(MediaType.APPLICATION_JSON)
	public Response logout(TokenAuth token) {
		LOG.fine("Logout request for user: " + token.username);

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

		// Step 3: Store the revoked token in the datastore, marking it as revoked
		Entity revokedToken = Entity.newBuilder(logoutKey)
				.set("username", token.username)
				.set("revoked_at", Timestamp.now())
				.build();

		datastore.put(revokedToken);

		LOG.info("Token revoked for user: " + token.username);

		// Step 4: Clean up session or user log entries (if you have session management)
		try {
			KeyFactory logKeyFactory = datastore.newKeyFactory()
					.addAncestor(PathElement.of("User", token.username))
					.setKind("UserLog");
			Key possibleLogKey = logKeyFactory.newKey(token.magicnumber);
			datastore.delete(possibleLogKey);
			LOG.info("User log entry deleted for: " + token.username);
		} catch (Exception e) {
			LOG.warning("No user log found or failed to delete log for: " + token.username);
		}

		

		// Return a response indicating successful logout
		return Response.ok("{\"message\":\"Logout successful.\"}").build();
	}


}
