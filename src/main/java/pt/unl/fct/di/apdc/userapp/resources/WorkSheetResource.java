package pt.unl.fct.di.apdc.userapp.resources;

import java.util.*;
import java.util.logging.Logger;

import com.google.cloud.datastore.*;
import com.google.gson.Gson;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;
import pt.unl.fct.di.apdc.userapp.util.*;

@Path("/worksheet")
@Produces(MediaType.APPLICATION_JSON + ";charset=utf-8")
public class WorkSheetResource {

    private static final Logger LOG = Logger.getLogger(WorkSheetResource.class.getName());
    private static final Datastore datastore = DatastoreOptions.getDefaultInstance().getService();
    private final Gson g = new Gson();

    @POST
    @Path("/create")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response createWorksheet(@HeaderParam("Authorization") String authHeader,
                                    @QueryParam("username") String username,
                                    @QueryParam("role") String role,
                                    @QueryParam("validTo") long validTo,
                                    WorkSheetData data) {

        TokenAuth token = extractToken(authHeader, username, role, validTo);
        if (token == null || !isTokenValid(token))
            return unauthorized();
        if (!Roles.SMBO.equalsIgnoreCase(token.role))
            return forbidden("Only SMBO can create worksheets.");
        if (data == null || !data.valid())
            return badRequest("Missing required fields.");

        try {
            Key key = datastore.newKeyFactory().setKind("WorkSheet").newKey(data.id);
            Entity worksheet = Entity.newBuilder(key)
                    .set("title", data.title)
                    .set("issue_date", data.issue_date)
                    .set("award_date", nvl(data.award_date))
                    .set("starting_date", nvl(data.starting_date))
                    .set("finishing_date", nvl(data.finishing_date))
                    .set("status", nvl(data.status, "nao_iniciado"))
                    .set("service_provider_id", data.service_provider_id)
                    .set("posa_code", data.posa_code)
                    .set("posa_description", data.posa_description)
                    .set("posp_code", data.posp_code)
                    .set("posp_description", data.posp_description)
                    .set("aigp", g.toJson(data.aigp))
                    .set("operations", g.toJson(data.operations))
                    .set("polygons", StringValue.newBuilder(g.toJson(data.polygon)).setExcludeFromIndexes(true).build())
                    .set("created_by", token.username)
                    .set("created_at", System.currentTimeMillis())
                    .build();

            datastore.put(worksheet);
            return Response.ok("{\"message\":\"Worksheet created successfully.\"}").build();

        } catch (Exception e) {
            LOG.severe("Error creating worksheet: " + e.getMessage());
            return internalError("Failed to create worksheet.");
        }
    }

    @GET
    @Path("/view/{id}")
    public Response viewWorksheet(@PathParam("id") String id,
                                  @QueryParam("role") String role) {
        Key key = datastore.newKeyFactory().setKind("WorkSheet").newKey(id);
        Entity entity = datastore.get(key);

        if (entity == null)
            return Response.status(Status.NOT_FOUND).entity("{\"error\":\"Not found\"}").build();

        boolean isSGVBO = Roles.SGVBO.equalsIgnoreCase(role);
        Map<String, Object> data = new HashMap<>();

        for (String name : entity.getNames()) {
            if (isSGVBO && !Set.of("title", "status", "issue_date", "created_at").contains(name))
                continue;
            data.put(name, entity.getValue(name).get());
        }

        return Response.ok(g.toJson(data)).build();
    }

    @POST
    @Path("/list")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response listWorksheets(@HeaderParam("Authorization") String authHeader,
                                   @QueryParam("username") String username,
                                   @QueryParam("role") String role,
                                   @QueryParam("validTo") long validTo,
                                   FilterRequest filter) {
        TokenAuth token = extractToken(authHeader, username, role, validTo);
        if (token == null || !isTokenValid(token))
            return unauthorized();

        Set<String> allowed = Set.of("smbo", "backoffice", "admin", Roles.SGVBO, Roles.SDVBO, Roles.SYSADMIN, Roles.SYSBO);
        if (!allowed.contains(token.role.toLowerCase()))
            return forbidden("Not allowed to list worksheets.");

        EntityQuery.Builder builder = Query.newEntityQueryBuilder().setKind("WorkSheet");
        if (filter.status != null && !filter.status.isEmpty())
            builder.setFilter(StructuredQuery.PropertyFilter.eq("status", filter.status));

        builder.setLimit(filter.limit).setOffset(filter.offset);
        Query<Entity> query = builder.build();

        QueryResults<Entity> results = datastore.run(query);
        List<Map<String, Object>> list = new ArrayList<>();

        while (results.hasNext()) {
            Entity e = results.next();
            Map<String, Object> data = new HashMap<>();
            for (String name : e.getNames()) {
                data.put(name, e.getValue(name).get());
            }
            list.add(data);
        }

        return Response.ok(g.toJson(list)).build();
    }

    @POST
    @Path("/updateStatus")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response updateStatus(@HeaderParam("Authorization") String authHeader,
                                 @QueryParam("username") String username,
                                 @QueryParam("role") String role,
                                 @QueryParam("validTo") long validTo,
                                 WorkSheetData data) {

        TokenAuth token = extractToken(authHeader, username, role, validTo);
        if (token == null || !isTokenValid(token))
            return unauthorized();
        if (!Roles.PRBO.equalsIgnoreCase(token.role))
            return forbidden("Only PRBO can update status.");

        Key key = datastore.newKeyFactory().setKind("WorkSheet").newKey(data.id);
        Entity ws = datastore.get(key);
        if (ws == null)
            return Response.status(Status.NOT_FOUND).build();

        if (!ws.getString("service_provider_id").equals(token.username))
            return forbidden("User not authorized for this worksheet.");

        Entity updated = Entity.newBuilder(ws).set("status", data.status).build();
        datastore.put(updated);

        return Response.ok("{\"message\":\"Status updated.\"}").build();
    }

    @DELETE
    @Path("/delete/{id}")
    public Response deleteWorksheet(@HeaderParam("Authorization") String authHeader,
                                    @QueryParam("username") String username,
                                    @QueryParam("role") String role,
                                    @QueryParam("validTo") long validTo,
                                    @PathParam("id") String id) {

        TokenAuth token = extractToken(authHeader, username, role, validTo);
        if (token == null || !isTokenValid(token))
            return unauthorized();

        if (!Set.of(Roles.SYSADMIN, Roles.SMBO).contains(token.role))
            return forbidden("Only SMBO or SYSADMIN can delete worksheets.");

        Key key = datastore.newKeyFactory().setKind("WorkSheet").newKey(id);
        Entity entity = datastore.get(key);
        if (entity == null)
            return Response.status(Status.NOT_FOUND).build();

        datastore.delete(key);
        return Response.ok("{\"message\":\"Worksheet deleted.\"}").build();
    }

    @GET
    @Path("/mapdata")
    public Response getMapData() {
        Query<Entity> query = Query.newEntityQueryBuilder().setKind("WorkSheet").build();
        QueryResults<Entity> results = datastore.run(query);

        List<Map<String, Object>> mapped = new ArrayList<>();
        while (results.hasNext()) {
            Entity e = results.next();
            Map<String, Object> obj = new HashMap<>();
            obj.put("id", e.getKey().getName());
            obj.put("title", e.getString("title"));
            obj.put("status", e.getString("status"));
            obj.put("polygon", new Gson().fromJson(e.getString("polygons"), List.class));
            mapped.add(obj);
        }

        return Response.ok(new Gson().toJson(mapped)).build();
    }

    @GET
    @Path("/stats")
    public Response getStatistics() {
        Map<String, Integer> stats = new HashMap<>();
        Query<Entity> query = Query.newEntityQueryBuilder().setKind("WorkSheet").build();
        QueryResults<Entity> results = datastore.run(query);
        int total = 0;
        while (results.hasNext()) {
            Entity e = results.next();
            String status = e.getString("status");
            stats.put(status, stats.getOrDefault(status, 0) + 1);
            total++;
        }
        stats.put("total", total);
        return Response.ok(g.toJson(stats)).build();
    }

    @GET
    @Path("/export")
    @Produces("text/csv")
    public Response exportWorksheets() {
        Query<Entity> query = Query.newEntityQueryBuilder().setKind("WorkSheet").build();
        QueryResults<Entity> results = datastore.run(query);

        StringBuilder sb = new StringBuilder("ID,Title,Status\n");
        while (results.hasNext()) {
            Entity e = results.next();
            sb.append(e.getKey().getName()).append(",")
              .append(e.getString("title")).append(",")
              .append(e.getString("status")).append("\n");
        }

        return Response.ok(sb.toString())
                .header("Content-Disposition", "attachment; filename=worksheets.csv")
                .build();
    }

    // --- Helpers ---

    private TokenAuth extractToken(String authHeader, String username, String role, long validTo) {
        if (authHeader == null || !authHeader.startsWith("Bearer "))
            return null;
        String magic = authHeader.substring("Bearer ".length());
        TokenAuth token = new TokenAuth(username, role);
        token.magicnumber = magic;
        token.validateTo = validTo;
        return token;
    }

    private boolean isTokenValid(TokenAuth token) {
        return token != null && System.currentTimeMillis() <= token.validateTo;
    }

    private Response unauthorized() {
        return Response.status(Status.UNAUTHORIZED)
                .entity("{\"message\":\"Token is expired or missing.\"}").build();
    }

    private Response forbidden(String msg) {
        return Response.status(Status.FORBIDDEN)
                .entity("{\"message\":\"" + msg + "\"}").build();
    }

    private Response badRequest(String msg) {
        return Response.status(Status.BAD_REQUEST)
                .entity("{\"message\":\"" + msg + "\"}").build();
    }

    private Response internalError(String msg) {
        return Response.status(Status.INTERNAL_SERVER_ERROR)
                .entity("{\"message\":\"" + msg + "\"}").build();
    }

    private String nvl(String s) {
        return s == null ? "" : s;
    }

    private String nvl(String s, String def) {
        return s == null ? def : s;
    }
}
