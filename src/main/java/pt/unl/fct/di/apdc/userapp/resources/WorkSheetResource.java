package pt.unl.fct.di.apdc.userapp.resources;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;

import org.glassfish.jersey.media.multipart.FormDataContentDisposition;
import org.glassfish.jersey.media.multipart.FormDataParam;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.DatastoreOptions;
import com.google.cloud.datastore.Entity;
import com.google.cloud.datastore.EntityQuery;
import com.google.cloud.datastore.Key;
import com.google.cloud.datastore.Query;
import com.google.cloud.datastore.QueryResults;
import com.google.cloud.datastore.StringValue;
import com.google.cloud.datastore.StructuredQuery;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.DELETE;
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
import pt.unl.fct.di.apdc.userapp.util.FilterRequest;
import pt.unl.fct.di.apdc.userapp.util.JWTToken;
import pt.unl.fct.di.apdc.userapp.util.Roles;
import pt.unl.fct.di.apdc.userapp.util.WorkSheetData;

@Path("/worksheet")
@Produces(MediaType.APPLICATION_JSON + ";charset=utf-8")
public class WorkSheetResource {

    private static final Logger LOG = Logger.getLogger(WorkSheetResource.class.getName());
    private static final Datastore datastore = DatastoreOptions.getDefaultInstance().getService();
    private final Gson g = new GsonBuilder().serializeNulls().create();

    private record AuthInfo(String username, String role) {}

    private String extractJWT(Cookie cookie, String authHeader) {
        if (cookie != null && cookie.getValue() != null)
            return cookie.getValue();
    
        if (authHeader != null && authHeader.startsWith("Bearer "))
            return authHeader.substring("Bearer ".length());
    
        return null;
    }

    @POST
    @Path("/create")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response createWorksheet(@CookieParam("session::apdc") Cookie cookie, @HeaderParam("Authorization") String authHeader, WorkSheetData data) {
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
        if (!Roles.SMBO.equalsIgnoreCase(requesterRole))
            return forbidden("Only SMBO can create worksheets.");
        if (!data.valid())
            return Response.status(Response.Status.BAD_REQUEST).entity("{\"message\":\"Missing required fields.\"}").build();

        try {
            Key key = datastore.newKeyFactory().setKind("WorkSheet").newKey(data.id);
            Entity worksheet = Entity.newBuilder(key)
                .set("title", data.title)
                .set("issue_date", data.issue_date)
                .set("award_date", data.award_date)
                .set("starting_date", data.starting_date)
                .set("finishing_date", data.finishing_date)
                .set("status", "nao_iniciado")
                .set("service_provider_id", data.service_provider_id)
                .set("issuing_user_id", data.issuing_user_id)
                .set("posa_code", data.posa_code)
                .set("posa_description", data.posa_description)
                .set("posp_code", data.posp_code)
                .set("posp_description", data.posp_description)
                .set("aigp", g.toJson(data.aigp))
                .set("operations", g.toJson(data.operations))
                .set("features", StringValue.newBuilder(g.toJson(data.features)).setExcludeFromIndexes(true).build())
                .set("created_by", requesterUsername)
                .set("created_at", System.currentTimeMillis())
                .build();

            datastore.put(worksheet);
            return Response.ok("{\"message\":\"Worksheet created successfully.\"}").build();

        } catch (Exception e) {
            LOG.severe("Error creating worksheet: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("{\"message\":\"Failed to create worksheet.\"}").build();
        }
    }


    @POST
    @Path("/upload")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response uploadWorksheetFile(
            @FormDataParam("file") InputStream uploadedInputStream,
            @FormDataParam("file") FormDataContentDisposition fileDetail,
            @CookieParam("session::apdc") Cookie cookie, @HeaderParam("Authorization") String authHeader) {
    		
    		String token = extractJWT(cookie, authHeader);
    		if (token == null || !JWTToken.validateJWT(token)) {
                return Response.status(Response.Status.UNAUTHORIZED)
                        .entity("{\"message\":\"Invalid or expired session.\"}").build();
            }
    		
            try {
            	
            	DecodedJWT jwt = JWTToken.extractJWT(token);
            	if (jwt == null) {
                   return Response.status(Response.Status.UNAUTHORIZED)
                           .entity("{\"message\":\"Failed to decode token.\"}").build();
            	}
            	String requesterRole = jwt.getClaim("role").asString();
                if (!Roles.SMBO.equalsIgnoreCase(requesterRole)) return forbidden("Only SMBO can upload worksheets.");
    
                String content = new String(uploadedInputStream.readAllBytes());
                JsonObject root = JsonParser.parseString(content).getAsJsonObject();
        
                
                JsonObject metadata = root.getAsJsonObject("metadata");
                metadata.add("features", root.get("features"));
                metadata.add("title", root.get("title"));

                WorkSheetData data = g.fromJson(metadata, WorkSheetData.class);
                data.features = Arrays.asList(g.fromJson(root.get("features"), WorkSheetData.Feature[].class));
                data.title = root.has("name") ? root.get("name").getAsString() : null;

                return createWorksheet(cookie, authHeader, data);

        } catch (Exception e) {
            LOG.severe("Failed to upload worksheet file: " + e.getMessage());
            return internalError("Upload failed.");
        }
    }
    
    @GET
    @Path("/view/{id}")
    public Response viewWorksheet(@PathParam("id") String id, @CookieParam("session::apdc") Cookie cookie, @HeaderParam("Authorization") String authHeader) {
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
    	String requesterRole = jwt.getClaim("role").asString();

        Key key = datastore.newKeyFactory().setKind("WorkSheet").newKey(id);
        Entity entity = datastore.get(key);

        if (entity == null)
            return Response.status(Response.Status.NOT_FOUND).entity("{\"error\":\"Not found\"}").build();

        boolean isSGVBO = Roles.SGVBO.equalsIgnoreCase(requesterRole);

        Map<String, Object> data = new HashMap<>();
        data.put("id", id); 
        for (String name : entity.getNames()) {
            if (isSGVBO && !Set.of("title", "status", "issue_date", "created_at").contains(name)) continue;
            data.put(name, entity.getValue(name).get());
        }

        return Response.ok(g.toJson(data)).build();
    }

    @POST
    @Path("/list")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response listWorksheets(FilterRequest filter, @CookieParam("session::apdc") Cookie cookie, @HeaderParam("Authorization") String authHeader) {
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
    	String requesterRole = jwt.getClaim("role").asString();
    	
        Set<String> allowed = Set.of("smbo", "backoffice", "admin", Roles.SGVBO, Roles.SDVBO, Roles.SYSADMIN, Roles.SYSBO);
        if (!allowed.contains(requesterRole.toLowerCase())) return forbidden("Not allowed to list worksheets.");

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
            data.put("id", e.getKey().getName()); 
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
    public Response updateStatus(WorkSheetData data, @CookieParam("session::apdc") Cookie cookie, @HeaderParam("Authorization") String authHeader) {
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
        if (!Roles.PRBO.equalsIgnoreCase(requesterRole))
            return forbidden("Only PRBO can update status.");

        Key key = datastore.newKeyFactory().setKind("WorkSheet").newKey(data.id);
        Entity ws = datastore.get(key);
        if (ws == null) return Response.status(Response.Status.NOT_FOUND).build();

        if (!ws.getString("service_provider_id").equals(requesterUsername))
            return forbidden("User not authorized for this worksheet.");

        Entity updated = Entity.newBuilder(ws).set("status", data.status).build();
        datastore.put(updated);

        return Response.ok("{\"message\":\"Status updated.\"}").build();
    }

    @DELETE
    @Path("/delete/{id}")
    public Response deleteWorksheet(@PathParam("id") String id, @CookieParam("session::apdc") Cookie cookie, @HeaderParam("Authorization") String authHeader) {
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
    	String requesterRole = jwt.getClaim("role").asString();
        if (!Set.of(Roles.SYSADMIN, Roles.SMBO).contains(requesterRole))
            return forbidden("Only SMBO or SYSADMIN can delete worksheets.");

        Key key = datastore.newKeyFactory().setKind("WorkSheet").newKey(id);
        Entity entity = datastore.get(key);
        if (entity == null) return Response.status(Response.Status.NOT_FOUND).build();

        datastore.delete(key);
        return Response.ok("{\"message\":\"Worksheet deleted.\"}").build();
    }

    @GET
    @Path("/mapdata")
    public Response getMapData(@CookieParam("session::apdc") Cookie cookie, @HeaderParam("Authorization") String authHeader) {
    	String token = extractJWT(cookie, authHeader);
    	if (token == null || !JWTToken.validateJWT(token)) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Invalid or expired session.\"}").build();
        }

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
    public Response getStatistics(@CookieParam("session::apdc") Cookie cookie, @HeaderParam("Authorization") String authHeader) {
    	String token = extractJWT(cookie, authHeader);
    	if (token == null || !JWTToken.validateJWT(token)) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Invalid or expired session.\"}").build();
        }

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
    public Response exportWorksheets(@CookieParam("session::apdc") Cookie cookie, @HeaderParam("Authorization") String authHeader) {
    	String token = extractJWT(cookie, authHeader);
    	if (token == null || !JWTToken.validateJWT(token)) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Invalid or expired session.\"}").build();
        }

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

    private Response unauthorized(String msg) {
        return Response.status(Status.UNAUTHORIZED)
        .entity("{\"message\":\"" + msg + "\"}").build();
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
