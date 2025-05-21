package pt.unl.fct.di.apdc.userapp.resources;


import java.util.logging.Logger;

import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import pt.unl.fct.di.apdc.userapp.util.RootInitializer;
import pt.unl.fct.di.apdc.userapp.util.TokenAuth;

import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.DatastoreOptions;
import com.google.gson.Gson;


@Path("/admin")
@Produces(MediaType.APPLICATION_JSON)
public class AdminResource {

    private static final Datastore datastore = DatastoreOptions.getDefaultInstance().getService();
    private static final Logger LOG = Logger.getLogger(AdminResource.class.getName());
    private final Gson g = new Gson();

    @POST
    @Path("/initRoot")
    public Response initRoot() {
        try {
            RootInitializer.createRootUserIfNotExists(datastore);
			TokenAuth token = new TokenAuth("root", "admin");
            return Response.ok(g.toJson(token)).build();
        } catch (Exception e) {
            LOG.severe("Failed to initialize root user: " + e.getMessage());
            return Response.serverError()
                .entity("{\"error\": \"Failed to initialize root user.\"}")
                .build();
        }
    }
}
