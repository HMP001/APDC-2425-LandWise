package pt.unl.fct.di.apdc.userapp.resources;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Logger;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.DatastoreOptions;
import com.google.cloud.datastore.Entity;
import com.google.cloud.datastore.Key;
import com.google.cloud.datastore.Query;
import com.google.cloud.datastore.QueryResults;
import com.google.cloud.datastore.StringValue;
import com.google.cloud.datastore.StructuredQuery;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Cookie;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import pt.unl.fct.di.apdc.userapp.util.ExecutionSheetData;
import pt.unl.fct.di.apdc.userapp.util.JWTToken;
import pt.unl.fct.di.apdc.userapp.util.Roles;

@Path("/execution")
@Produces(MediaType.APPLICATION_JSON + ";charset=utf-8")
public class ExecutionSheetResource {

    private static final Logger LOG = Logger.getLogger(ExecutionSheetResource.class.getName());
    private static final Datastore datastore = DatastoreOptions.getDefaultInstance().getService();
    private final Gson g = new GsonBuilder().serializeNulls().create();

    private String extractJWT(Cookie cookie, String authHeader) {
        if (cookie != null && cookie.getValue() != null)
            return cookie.getValue();
        if (authHeader != null && authHeader.startsWith("Bearer "))
            return authHeader.substring("Bearer ".length());
        return null;
    }

    private Response unauthorized(String msg) {
        return Response.status(Response.Status.UNAUTHORIZED).entity("{\"message\":\"" + msg + "\"}").build();
    }

    private Response forbidden(String msg) {
        return Response.status(Response.Status.FORBIDDEN).entity("{\"message\":\"" + msg + "\"}").build();
    }

    @POST
    @Path("/create")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response createExecutionSheet(@CookieParam("session::apdc") Cookie cookie,
                                         @HeaderParam("Authorization") String authHeader,
                                         ExecutionSheetData data) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        String userId = jwt.getSubject();
        if (!Roles.PRBO.equalsIgnoreCase(role))
            return forbidden("Only PRBO can create execution sheets");

        if (data == null || !data.valid())
            return Response.status(Response.Status.BAD_REQUEST).entity("{\"error\":\"Invalid or incomplete execution sheet data\"}").build();

        Key wsKey = datastore.newKeyFactory().setKind("WorkSheet").newKey(data.worksheet_id);
        Entity worksheet = datastore.get(wsKey);
        if (worksheet == null)
            return Response.status(Response.Status.NOT_FOUND).entity("{\"error\":\"Worksheet not found\"}").build();

        String executionId = data.worksheet_id + "-" + UUID.randomUUID();
        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(executionId);

        Entity.Builder builder = Entity.newBuilder(execKey)
                .set("worksheet_id", data.worksheet_id)
                .set("created_by", userId)
                .set("created_at", System.currentTimeMillis())
                .set("status", "por_atribuir")
                .set("starting_date", nvl(data.starting_date))
                .set("finishing_date", nvl(data.finishing_date, ""))
                .set("last_activity_date", nvl(data.last_activity_date, ""))
                .set("observations", nvl(data.observations, ""))
                .set("operations", g.toJson(data.operations))
                .set("polygons_operations", StringValue.newBuilder(g.toJson(data.polygons_operations)).setExcludeFromIndexes(true).build());

        datastore.put(builder.build());

        return Response.ok("{\"message\":\"Execution sheet created.\"}").build();
    }

    @POST
    @Path("/assign")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response assignOperationToOperator(@CookieParam("session::apdc") Cookie cookie,
                                              @HeaderParam("Authorization") String authHeader,
                                              ExecutionSheetData data) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) return unauthorized("Invalid session");
    
        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) return unauthorized("Failed to decode token");
    
        String role = jwt.getClaim("role").asString();
        if (!Roles.PRBO.equalsIgnoreCase(role))
            return forbidden("Only PRBO can assign operations");
    
        if (data == null || data.polygons_operations == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Invalid execution sheet data\"}").build();
        }
    
        for (ExecutionSheetData.PolygonOperations poly : data.polygons_operations) {
            int polygonId = poly.polygon_id;
            for (ExecutionSheetData.PolygonOperation op : poly.operations) {
                String compositeKey = data.worksheet_id + ":" + op.operation_code + ":" + polygonId;
                Key key = datastore.newKeyFactory().setKind("ExecutionAssignment").newKey(compositeKey);
    
                Entity entity = Entity.newBuilder(key)
                        .set("worksheet_id", data.worksheet_id)
                        .set("operation_code", op.operation_code)
                        .set("polygon_id", polygonId)
                        .set("status", op.status != null ? op.status : "atribuido")
                        .set("assigned_at", System.currentTimeMillis())
                        .build();
    
                datastore.put(entity);
            }
        }
    
        return Response.ok("{\"message\":\"Assignments saved.\"}").build();
    }
    
    @POST
    @Path("/startActivity")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response startActivity(@CookieParam("session::apdc") Cookie cookie,
                                @HeaderParam("Authorization") String authHeader,
                                ExecutionSheetData data) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        String user = jwt.getSubject();
        if (!Roles.PO.equalsIgnoreCase(role)) return forbidden("Only PO can start activities");

        if (data == null || data.worksheet_id == null || data.polygons_operations == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Invalid execution sheet data\"}").build();

        for (ExecutionSheetData.PolygonOperations poly : data.polygons_operations) {
            int polygonId = poly.polygon_id;
            for (ExecutionSheetData.PolygonOperation op : poly.operations) {
                Key actKey = datastore.allocateId(datastore.newKeyFactory().setKind("ExecutionActivity").newKey());

                op.activity_id = String.valueOf(actKey.getId());

                Entity activity = Entity.newBuilder(actKey)
                        .set("worksheet_id", data.worksheet_id)
                        .set("operation_code", op.operation_code)
                        .set("polygon_id", polygonId)
                        .set("operator_id", user)
                        .set("start_time", System.currentTimeMillis())
                        .set("status", "em_execucao")
                        .build();

                datastore.put(activity);
            }
        }

        return Response.ok(g.toJson(data)).build(); 
    }

    @POST
    @Path("/stopActivity")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response stopActivity(@CookieParam("session::apdc") Cookie cookie,
                                @HeaderParam("Authorization") String authHeader,
                                ExecutionSheetData data) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        if (!Roles.PO.equalsIgnoreCase(role))
            return forbidden("Only PO can stop activities");

        if (data == null || data.polygons_operations == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Invalid execution sheet data\"}").build();

        int updates = 0;

        for (ExecutionSheetData.PolygonOperations poly : data.polygons_operations) {
            for (ExecutionSheetData.PolygonOperation op : poly.operations) {
                if (op.activity_id == null || op.activity_id.isBlank()) continue;

                Key key;
                try {
                    key = datastore.newKeyFactory()
                            .setKind("ExecutionActivity")
                            .newKey(Long.parseLong(op.activity_id));
                } catch (NumberFormatException e) {
                    continue; 
                }

                Entity existing = datastore.get(key);
                if (existing == null) continue;

                Entity updated = Entity.newBuilder(existing)
                        .set("end_time", System.currentTimeMillis())
                        .set("status", "executado")
                        .build();

                datastore.put(updated);
                updates++;
            }
        }

        return Response.ok("{\"message\":\"" + updates + " activity(ies) completed.\"}").build();
    }


    @POST
    @Path("/addInfo")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response addInfoToActivity(@CookieParam("session::apdc") Cookie cookie,
                                    @HeaderParam("Authorization") String authHeader,
                                    ExecutionSheetData data) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) return unauthorized("Failed to decode token");

        if (!Roles.PO.equalsIgnoreCase(jwt.getClaim("role").asString()))
            return forbidden("Only PO can add info");

        if (data == null || data.polygons_operations == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Invalid execution sheet data\"}").build();

        int updates = 0;

        for (ExecutionSheetData.PolygonOperations poly : data.polygons_operations) {
            for (ExecutionSheetData.PolygonOperation op : poly.operations) {
                if (op.activity_id == null || op.activity_id.isBlank()) continue;

                Key key;
                try {
                    key = datastore.newKeyFactory()
                            .setKind("ExecutionActivity")
                            .newKey(Long.parseLong(op.activity_id));
                } catch (NumberFormatException e) {
                    continue;
                }

                Entity existing = datastore.get(key);
                if (existing == null) continue;

                Entity.Builder updated = Entity.newBuilder(existing);

                if (op.observations != null)
                    updated.set("observations", op.observations);

                if (op.tracks != null)
                    updated.set("gpx_track", g.toJson(op.tracks));

                datastore.put(updated.build());
                updates++;
            }
        }

        return Response.ok("{\"message\":\"" + updates + " activity(ies) updated with info.\"}").build();
    }


    @GET
    @Path("/status/{worksheetId}/{operationCode}/{polygonId}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getStatusByParcel(@PathParam("worksheetId") String worksheetId,
                                      @PathParam("operationCode") String operationCode,
                                      @PathParam("polygonId") String polygonId,
                                      @CookieParam("session::apdc") Cookie cookie,
                                      @HeaderParam("Authorization") String authHeader) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) return unauthorized("Invalid session");
    
        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) return unauthorized("Failed to decode token");
    
        String role = jwt.getClaim("role").asString();
        if (!Set.of(Roles.PO, Roles.PRBO).contains(role))
            return forbidden("Access denied");
    
        Query<Entity> query = Query.newEntityQueryBuilder()
            .setKind("ExecutionActivity")
            .setFilter(StructuredQuery.CompositeFilter.and(
                StructuredQuery.PropertyFilter.eq("worksheet_id", worksheetId),
                StructuredQuery.PropertyFilter.eq("operation_code", operationCode),
                StructuredQuery.PropertyFilter.eq("polygon_id", polygonId)
            )).build();
    
        QueryResults<Entity> results = datastore.run(query);
        List<ExecutionSheetData.PolygonOperation> activities = new ArrayList<>();
    
        while (results.hasNext()) {
            Entity e = results.next();
            ExecutionSheetData.PolygonOperation op = new ExecutionSheetData.PolygonOperation();
            op.operation_code = operationCode;
            op.activity_id = String.valueOf(e.getKey().getId());
            op.status = e.contains("status") ? e.getString("status") : null;
            op.starting_date = e.contains("start_time") ? String.valueOf(e.getLong("start_time")) : null;
            op.finishing_date = e.contains("end_time") ? String.valueOf(e.getLong("end_time")) : null;
            op.observations = e.contains("observations") ? e.getString("observations") : null;
            if (e.contains("gpx_track")) {
                try {
                    op.tracks = List.of(g.fromJson(e.getString("gpx_track"), ExecutionSheetData.Track[].class));
                } catch (Exception ignore) {}
            }
            activities.add(op);
        }
    
        return Response.ok(g.toJson(activities)).build();
    }
    
    @GET
    @Path("/status/global/{worksheetId}/{operationCode}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getGlobalStatus(@PathParam("worksheetId") String worksheetId,
                                    @PathParam("operationCode") String opCode,
                                    @CookieParam("session::apdc") Cookie cookie,
                                    @HeaderParam("Authorization") String authHeader) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) return unauthorized("Invalid session");
    
        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) return unauthorized("Failed to decode token");
    
        String role = jwt.getClaim("role").asString();
        if (!Set.of(Roles.PRBO, Roles.SDVBO).contains(role))
            return forbidden("Access denied");
    
        Query<Entity> query = Query.newEntityQueryBuilder()
            .setKind("ExecutionActivity")
            .setFilter(StructuredQuery.CompositeFilter.and(
                StructuredQuery.PropertyFilter.eq("worksheet_id", worksheetId),
                StructuredQuery.PropertyFilter.eq("operation_code", opCode)
            )).build();
    
        QueryResults<Entity> results = datastore.run(query);
        int total = 0;
        int completed = 0;
    
        while (results.hasNext()) {
            Entity e = results.next();
            total++;
            if (e.contains("status") && "executado".equalsIgnoreCase(e.getString("status"))) {
                completed++;
            }
        }
    
        Map<String, Object> result = new HashMap<>();
        result.put("worksheet_id", worksheetId);
        result.put("operation_code", opCode);
        result.put("total_activities", total);
        result.put("completed", completed);
        result.put("percentage", total == 0 ? 0 : (completed * 100 / total));
    
        return Response.ok(g.toJson(result)).build();
    }
    

    @GET
    @Path("/export/{worksheetId}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response exportExecutionSheet(@PathParam("worksheetId") String worksheetId,
                                        @CookieParam("session::apdc") Cookie cookie,
                                        @HeaderParam("Authorization") String authHeader) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) return unauthorized("Failed to decode token");

        if (!Roles.SDVBO.equalsIgnoreCase(jwt.getClaim("role").asString()))
            return forbidden("Only SDVBO can export");

        Query<Entity> query = Query.newEntityQueryBuilder()
            .setKind("ExecutionActivity")
            .setFilter(StructuredQuery.PropertyFilter.eq("worksheet_id", worksheetId))
            .build();

        QueryResults<Entity> results = datastore.run(query);
        List<ExecutionSheetData.PolygonOperation> activities = new ArrayList<>();

        while (results.hasNext()) {
            Entity e = results.next();
            ExecutionSheetData.PolygonOperation op = new ExecutionSheetData.PolygonOperation();
            op.operation_code = e.contains("operation_code") ? e.getString("operation_code") : null;
            op.activity_id = String.valueOf(e.getKey().getId());
            op.status = e.contains("status") ? e.getString("status") : null;
            op.starting_date = e.contains("start_time") ? String.valueOf(e.getLong("start_time")) : null;
            op.finishing_date = e.contains("end_time") ? String.valueOf(e.getLong("end_time")) : null;
            op.observations = e.contains("observations") ? e.getString("observations") : null;

            if (e.contains("gpx_track")) {
                try {
                    op.tracks = List.of(g.fromJson(e.getString("gpx_track"), ExecutionSheetData.Track[].class));
                } catch (Exception ignore) {}
            }

            activities.add(op);
        }

        return Response.ok(g.toJson(activities)).build();
    }


    @PUT
    @Path("/editOperation")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response editOperationInfo(@CookieParam("session::apdc") Cookie cookie,
                                    @HeaderParam("Authorization") String authHeader,
                                    ExecutionSheetData.Operation operation) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        if (!Set.of(Roles.PRBO, Roles.SDVBO).contains(role))
            return forbidden("Access denied");
    
        String worksheetId = jwt.getClaim("worksheet_id").asString(); 
        if (worksheetId == null || operation.operation_code == null)
            return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"error\":\"Missing worksheet_id or operation_code\"}").build();

        Key key = datastore.newKeyFactory()
                        .setKind("ExecutionOperation")
                        .newKey(worksheetId + ":" + operation.operation_code);

        Entity.Builder builder = datastore.get(key) != null
            ? Entity.newBuilder(datastore.get(key))
            : Entity.newBuilder(key)
                    .set("worksheet_id", worksheetId)
                    .set("operation_code", operation.operation_code);

        builder.set("area_ha_executed", operation.area_ha_executed);
        builder.set("area_perc", operation.area_perc);

        if (operation.starting_date != null)
            builder.set("starting_date", operation.starting_date);
        if (operation.finishing_date != null)
            builder.set("finishing_date", operation.finishing_date);
        if (operation.observations != null)
            builder.set("observations", operation.observations);

        datastore.put(builder.build());
        return Response.ok("{\"message\":\"Operation data updated.\"}").build();
    }


    @POST
    @Path("/notify/out")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response notifyOperatorOutOfArea(Map<String, String> input) {
        String operatorId = input.get("operator_id");
        String worksheetId = input.get("worksheet_id");
        String polygonId = input.get("polygon_id");
        LOG.info("[NOTIFY-OUT] Operator " + operatorId + " is out of the area (polygon " + polygonId + ") for worksheet " + worksheetId);
        return Response.ok("{\"message\":\"Notification registered for operator out of area.\"}").build();
    }

    @POST
    @Path("/notify/polyEnd")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response notifyOperationCompletedInParcel(Map<String, String> input) {
        String operation = input.get("operation_code");
        String worksheetId = input.get("worksheet_id");
        String polygonId = input.get("polygon_id");
        LOG.info("[NOTIFY-OPER-POLY-END] Operation " + operation + " completed in polygon " + polygonId + " of worksheet " + worksheetId);
        return Response.ok("{\"message\":\"Notification registered for parcel operation completion.\"}").build();
    }

    @POST
    @Path("/notify/operationEnd")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response notifyOperationCompletedAllParcels(Map<String, String> input) {
        String operation = input.get("operation_code");
        String worksheetId = input.get("worksheet_id");
        LOG.info("[NOTIFY-OPER-END] Operation " + operation + " completed in ALL parcels of worksheet " + worksheetId);
        return Response.ok("{\"message\":\"Notification registered for operation completion in all parcels.\"}").build();
    }

    private String nvl(String s) {
        return s == null ? "" : s;
    }

    private String nvl(String s, String def) {
        return s == null ? def : s;
    }
}


