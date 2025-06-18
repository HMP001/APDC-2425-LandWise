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
import pt.unl.fct.di.apdc.userapp.util.LoginData;
import pt.unl.fct.di.apdc.userapp.util.RegisterData;
import pt.unl.fct.di.apdc.userapp.util.AccountData;

@Path("/register")
public class RegisterResource {

	private static final Logger LOG = Logger.getLogger(RegisterResource.class.getName());
	private static final Datastore datastore = DatastoreOptions.getDefaultInstance().getService();

	private final Gson g = new Gson();


	public RegisterResource() {}	// Default constructor, nothing to do
	
	@POST
	@Path("/v1")
	@Consumes(MediaType.APPLICATION_JSON)
	public Response registerUserV1(LoginData data) {
		LOG.fine("Attempt to register user: " + data.username);
	
		Key userKey = datastore.newKeyFactory().setKind("User").newKey(data.username);
		Entity user = Entity.newBuilder(userKey)
						.set("user_pwd", DigestUtils.sha512Hex(data.password))
						.set("user_creation_time", Timestamp.now())
						.build();
		datastore.put(user);
		LOG.info("User registered " + data.username);
		return Response.ok().entity(g.toJson(true)).build();
	}
	
	@POST
	@Path("/v2")
	@Consumes(MediaType.APPLICATION_JSON)
	public Response registerUserV2(RegisterData data) {
		LOG.fine("Attempt to register user: " + data.username);

		if(!data.validRegistration())
			return Response.status(Status.BAD_REQUEST).entity("Missing or wrong parameter.").build();
					
		Key userKey = datastore.newKeyFactory().setKind("User").newKey(data.username);
		Entity user = datastore.get(userKey);
		
		if(user != null)
			return Response.status(Status.BAD_REQUEST).entity("User already exists.").build();
		
		user = Entity.newBuilder(userKey)
				.set("user_name", data.name)
				.set("user_pwd", DigestUtils.sha512Hex(data.password))
				.set("user_email", data.email)
				.set("user_creation_time", Timestamp.now())
				.build();

		// Concurrency problem...
		// When we reach here, another client might have put() an entity with the same key...
		
		datastore.put(user);
		LOG.info("User registered " + data.username);
		
		
		return Response.ok().build();
	}
	
	@POST
	@Path("/v3")
	@Consumes(MediaType.APPLICATION_JSON)
	public Response registerUserV3(RegisterData data) {
		LOG.fine("Attempt to register user: " + data.username);

		if (!data.validRegistration()) {
			return Response.status(Status.BAD_REQUEST).entity("Missing or wrong parameter.").build();
		}

		Transaction txn = datastore.newTransaction();
		try {
			Key userKey = datastore.newKeyFactory().setKind("User").newKey(data.username);
			Entity user = txn.get(userKey);
			
			// If the entity does not exist null is returned...
			if (user != null) {
				txn.rollback();
				return Response.status(Status.CONFLICT).entity("User already exists.").build();
			} else {
				 // ... otherwise
				user = Entity.newBuilder(userKey).set("user_name", data.name)
						.set("user_pwd", DigestUtils.sha512Hex(data.password)).set("user_email", data.email)
						.set("user_creation_time", Timestamp.now()).build();
				// get() followed by put() inside a transaction is ok...
				txn.put(user);
				txn.commit();
				LOG.info("User registered " + data.username);
				return Response.ok().build();
			}
		}
		catch (DatastoreException e) {
			return Response.status(Status.INTERNAL_SERVER_ERROR).entity(e.toString()).build();
		} finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}
	}	

	@POST
	@Path("/v4")
	@Consumes(MediaType.APPLICATION_JSON)
	public Response registerUserV4(RegisterData data) {
		LOG.fine("Attempt to register user: " + data.username);
		
		if(!data.validRegistration())
			return Response.status(Status.BAD_REQUEST).entity("Missing or wrong parameter.").build();
		
		
		try {
			Key userKey = datastore.newKeyFactory().setKind("User").newKey(data.username);
			
			Entity user = Entity.newBuilder(userKey)
					.set("user_name", data.name)
					.set("user_pwd", DigestUtils.sha512Hex(data.password))
					.set("user_email", data.email)
					.set("user_creation_time", Timestamp.now())
					.build();

			datastore.add(user);
			LOG.info("User registered " + data.username);
			
			return Response.ok().build();
		}
		catch(DatastoreException e) {
			LOG.log(Level.ALL, e.toString());
			return Response.status(Status.BAD_REQUEST).entity(e.getReason()).build();
		}
	}



	@POST
	@Path("/newaccount")
	@Consumes(MediaType.APPLICATION_JSON)
	public Response registerNewUser(AccountData data) {
		LOG.fine("Attempt to register user: " + data.username);

		if(!data.validRegistration())
			return Response.status(Status.BAD_REQUEST).entity("Missing or wrong parameter.").build();
			
		Transaction txn = datastore.newTransaction();
		try {
			Key userKey = datastore.newKeyFactory().setKind("User").newKey(data.username);
			Entity user = datastore.get(userKey);
		
			if(user != null){
				txn.rollback();
				return Response.status(Status.CONFLICT).entity("User already exists.").build();
			} else {
		user = Entity.newBuilder(userKey)
				.set("user_name", data.name)
				.set("user_pwd", DigestUtils.sha512Hex(data.password))
				.set("user_telephone", data.telephone)
				.set("user_email", data.email)
				.set("user_profile", data.profile)
				.set("user_role", "enduser")
				.set("user_account_state", "desactivated")
				.set("user_creation_time", Timestamp.now())
				.build();
		txn.put(user);
		txn.commit();
		LOG.info("User registered " + data.username);	
		return Response.ok().build();
		}
	}
		catch(DatastoreException e ){
			return Response.status(Status.INTERNAL_SERVER_ERROR).entity(e.toString()).build();
		}finally {
			if(txn.isActive()){
				txn.rollback();
			}
		}
		
	}
}
