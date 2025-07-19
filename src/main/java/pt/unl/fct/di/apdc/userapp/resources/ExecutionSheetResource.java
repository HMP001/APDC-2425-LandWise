package pt.unl.fct.di.apdc.userapp.resources;

import java.lang.reflect.Type;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.DatastoreOptions;
import com.google.cloud.datastore.Entity;
import com.google.cloud.datastore.Key;
import com.google.cloud.datastore.PathElement;
import com.google.cloud.datastore.Query;
import com.google.cloud.datastore.QueryResults;
import com.google.cloud.datastore.StructuredQuery;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.reflect.TypeToken;

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
import pt.unl.fct.di.apdc.userapp.util.ExecutionSheetData;
import pt.unl.fct.di.apdc.userapp.util.JWTToken;
import pt.unl.fct.di.apdc.userapp.util.Roles;
import pt.unl.fct.di.apdc.userapp.util.execution.AddInfoToActivityRequest;
import pt.unl.fct.di.apdc.userapp.util.execution.AssignOperationRequest;
import pt.unl.fct.di.apdc.userapp.util.execution.CreateExecutionSheetRequest;
import pt.unl.fct.di.apdc.userapp.util.execution.EditOperationRequest;
import pt.unl.fct.di.apdc.userapp.util.execution.StartActivityRequest;
import pt.unl.fct.di.apdc.userapp.util.execution.StopActivityRequest;

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
            CreateExecutionSheetRequest input) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        String userId = jwt.getSubject();

        if (!Roles.PRBO.equalsIgnoreCase(role))
            return forbidden("Only PRBO can create execution sheets");

        if (input == null || input.worksheet_id == null || input.worksheet_id.isEmpty())
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"worksheet_id is required\"}").build();

        String worksheetId = input.worksheet_id;
        Key wsKey = datastore.newKeyFactory().setKind("WorkSheet").newKey(worksheetId);
        Entity worksheet = datastore.get(wsKey);
        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(worksheetId);
        if (worksheet == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Worksheet not found\"}").build();
        if (datastore.get(execKey) != null)
            return Response.status(Status.CONFLICT).entity("Worksheet já existe.").build();

        Entity userEntity = datastore.get(datastore.newKeyFactory().setKind("User").newKey(userId));
        if (userEntity == null || !userEntity.contains("user_employer"))
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"User does not have an associated service provider.\"}").build();

        String providerFromUser = userEntity.getString("user_employer");
        String providerFromWS = worksheet.getString("service_provider_id");
        if (!providerFromWS.equals(providerFromUser))
            return forbidden("You cannot create execution sheets for worksheets not assigned to your provider.");

        String startingDate = worksheet.contains("starting_date") ? worksheet.getString("starting_date") : "";
        String finishingDate = worksheet.contains("finishing_date") ? worksheet.getString("finishing_date") : "";
        String observations = worksheet.contains("observations") ? worksheet.getString("observations") : "";

        String operationsJson = worksheet.contains("operations") ? worksheet.getString("operations") : "[]";
        String polygonsJson = worksheet.contains("features") ? worksheet.getString("features") : "[]";

        JsonArray features = JsonParser.parseString(polygonsJson).getAsJsonArray();
        JsonArray opsArray = JsonParser.parseString(operationsJson).getAsJsonArray();

        Map<String, Integer> operationCodeToId = new HashMap<>();
        int idCounter = 1;
        for (JsonElement op : opsArray) {
            JsonObject opObj = op.getAsJsonObject();
            if (!opObj.has("operation_code"))
                continue;
            String code = opObj.get("operation_code").getAsString();
            operationCodeToId.put(code, idCounter++);
        }

        // Collect polygon_operation IDs
        List<Entity> polyOpsEntities = new ArrayList<>();
        List<String> polyOpIds = new ArrayList<>();
        for (JsonElement f : features) {
            JsonObject feature = f.getAsJsonObject();
            JsonObject props = feature.getAsJsonObject("properties");
            if (!props.has("polygon_id"))
                continue;
            int polygonId = props.get("polygon_id").getAsInt();

            for (Map.Entry<String, Integer> entry : operationCodeToId.entrySet()) {
                String opCode = entry.getKey();
                int opId = entry.getValue();
                // Composite key: executionId:polygonId:operationCode
                String compositeKey = worksheetId + ":" + polygonId + ":" + opCode;
                // Use ExecutionSheet as ancestor for Exec_Poly-Op
                PathElement execSheetAncestor = PathElement.of("ExecutionSheet", worksheetId);
                Key opKey = datastore.newKeyFactory().setKind("Exec_Poly-Op").addAncestor(execSheetAncestor)
                        .newKey(compositeKey);
                Entity.Builder polyOpBuilder = Entity.newBuilder(opKey)
                        .set("execution_id", worksheetId)
                        .set("polygon_id", polygonId)
                        .set("operation_code", opCode)
                        .set("operation_id", opId)
                        .set("status", "nao_iniciado");
                polyOpsEntities.add(polyOpBuilder.build());
                polyOpIds.add(compositeKey);
            }
        }
        if (!polyOpsEntities.isEmpty()) {
            datastore.put(polyOpsEntities.toArray(Entity[]::new));
        }

        // Create ExecutionSheet entity (metadata + polygon_operation_ids)
        Entity.Builder sheetBuilder = Entity.newBuilder(execKey)
                .set("worksheet_id", worksheetId)
                .set("created_by", userId)
                .set("created_at", System.currentTimeMillis())
                .set("starting_date", startingDate)
                .set("finishing_date", finishingDate)
                .set("observations", observations)
                .set("operations", operationsJson)
                .set("polygon_operation_ids", g.toJson(polyOpIds));
        datastore.put(sheetBuilder.build());

        return Response.ok("{\"message\":\"Execution sheet and polygon-operations created.\"}").build();
    }

    @POST
    @Path("/assign")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response assignOperationToOperator(@CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader,
            AssignOperationRequest input) {

        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        String userId = jwt.getSubject();

        if (!Roles.PRBO.equalsIgnoreCase(role))
            return forbidden("Only PRBO can assign operations");

        if (input == null || input.execution_id == null || input.polygon_operations == null
                || input.polygon_operations.isEmpty())
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing execution_id or polygon_operations\"}").build();

        Entity userEntity = datastore.get(datastore.newKeyFactory().setKind("User").newKey(userId));
        if (userEntity == null || !userEntity.contains("user_employer"))
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"PRBO does not have an associated employer.\"}").build();

        String employer = userEntity.getString("user_employer");
        String executionId = input.execution_id;

        int assignedCount = 0;
        List<String> debugOutput = new ArrayList<>();

        for (pt.unl.fct.di.apdc.userapp.util.execution.AssignOperationRequest.PolygonOperationAssignment assign : input.polygon_operations) {
            if (assign == null || assign.polygon_id == 0 || assign.operations == null || assign.operations.isEmpty()) {
                debugOutput.add("⚠️ Missing fields in polygon_operations object.");
                continue;
            }
            int polygonId = assign.polygon_id;
            for (pt.unl.fct.di.apdc.userapp.util.execution.AssignOperationRequest.OperationAssignment opObj : assign.operations) {
                if (opObj == null || opObj.operation_code == null || opObj.operator_username == null) {
                    debugOutput.add("⚠️ Missing fields in operations object for polygon " + polygonId);
                    continue;
                }
                String operationCode = opObj.operation_code;
                String operatorUsername = opObj.operator_username;

                // Validate operator
                Key operatorKey = datastore.newKeyFactory().setKind("User").newKey(operatorUsername);
                Entity operator = datastore.get(operatorKey);
                if (operator == null) {
                    debugOutput.add("❌ Operator not found: " + operatorUsername);
                    continue;
                }
                if (!Roles.PO.equalsIgnoreCase(operator.getString("user_role"))) {
                    debugOutput.add("❌ User " + operatorUsername + " is not a PO.");
                    continue;
                }
                if (!operator.getString("user_employer").equals(employer)) {
                    debugOutput.add("❌ Operator " + operatorUsername + " not from your organization.");
                    continue;
                }

                // Update Exec_Poly-Op entity
                PathElement execSheetAncestor = PathElement.of("ExecutionSheet", executionId);
                String compositeKey = executionId + ":" + polygonId + ":" + operationCode;
                Key polyOpKey = datastore.newKeyFactory().setKind("Exec_Poly-Op").addAncestor(execSheetAncestor)
                        .newKey(compositeKey);
                Entity polyOpEntity = datastore.get(polyOpKey);
                if (polyOpEntity == null) {
                    debugOutput.add("⚠️ Exec_Poly-Op entity not found for " + compositeKey);
                    continue;
                }
                Entity updatedPolyOp = Entity.newBuilder(polyOpEntity)
                        .set("operator_username", operatorUsername)
                        .set("status", "atribuido")
                        .build();
                datastore.put(updatedPolyOp);
                assignedCount++;
                debugOutput.add("✅ Assigned " + operatorUsername + " to " + operationCode + " in polygon " + polygonId);
            }
        }

        JsonObject response = new JsonObject();
        response.addProperty("message", assignedCount + " assignments saved.");
        response.add("debug", g.toJsonTree(debugOutput));

        return Response.ok(g.toJson(response)).build();
    }

    @POST
    @Path("/startActivity")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response startActivity(@CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader,
            StartActivityRequest input) {

        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        String user = jwt.getSubject();

        if (!Roles.PO.equalsIgnoreCase(role))
            return forbidden("Only PO can start activities");

        if (input == null || input.execution_id == null || input.polygon_id == 0 || input.operation_code == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing execution_id, polygon_id or operation_code\"}").build();

        // Find the Exec_Poly-Op entity
        PathElement execSheetAncestor = PathElement.of("ExecutionSheet", input.execution_id);
        String compositeKey = input.execution_id + ":" + input.polygon_id + ":" + input.operation_code;
        Key polyOpKey = datastore.newKeyFactory().setKind("Exec_Poly-Op").addAncestor(execSheetAncestor)
                .newKey(compositeKey);
        Entity polyOpEntity = datastore.get(polyOpKey);
        if (polyOpEntity == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Exec_Poly-Op entity not found\"}").build();

        // Validate operator
        String assignedOperator = polyOpEntity.contains("operator_username")
                ? polyOpEntity.getString("operator_username")
                : null;
        if (!user.equals(assignedOperator)) {
            JsonObject response = new JsonObject();
            response.addProperty("message", "⛔ " + input.operation_code + " not assigned to you.");
            return Response.ok(g.toJson(response)).build();
        }

        String now = LocalDateTime.now().toString();
        String today = LocalDate.now().toString();

        // Create ExecutionActivity entity
        Key activityKey = datastore.allocateId(
                datastore.newKeyFactory().setKind("ExecutionActivity").addAncestor(execSheetAncestor).newKey());
        Entity.Builder activityBuilder = Entity.newBuilder(activityKey)
                .set("execution_id", input.execution_id)
                .set("polygon_id", input.polygon_id)
                .set("operation_code", input.operation_code)
                .set("operator_username", user)
                .set("start_time", now)
                .set("status", "em_execucao");
        Entity activityEntity = activityBuilder.build();
        datastore.put(activityEntity);

        // Update status in Exec_Poly-Op and append activity_id to activities array
        List<Long> activities = new ArrayList<>();
        if (polyOpEntity.contains("activities")) {
            String activitiesJson = polyOpEntity.getString("activities");
            try {
                java.lang.reflect.Type longListType = new com.google.gson.reflect.TypeToken<List<Long>>() {
                }.getType();
                activities = g.fromJson(activitiesJson, longListType);
                if (activities == null)
                    activities = new ArrayList<>();
            } catch (Exception ignore) {
            }
        }
        activities.add(activityKey.getId());
        Entity updatedPolyOp = Entity.newBuilder(polyOpEntity)
                .set("status", "em_execucao")
                .set("starting_date", today)
                .set("last_activity_date", today)
                .set("activities", g.toJson(activities))
                .build();
        datastore.put(updatedPolyOp);

        JsonObject response = new JsonObject();
        response.addProperty("message",
                "✅ Started activity " + input.operation_code + " in polygon " + input.polygon_id);
        response.addProperty("activity_id", String.valueOf(activityKey.getId()));
        return Response.ok(g.toJson(response)).build();
    }

    @POST
    @Path("/stopActivity")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response stopActivity(@CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader,
            StopActivityRequest input) {

        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        String user = jwt.getSubject();

        if (!Roles.PO.equalsIgnoreCase(role))
            return forbidden("Only PO can stop activities");

        if (input == null || input.execution_id == null || input.polygon_id == 0 || input.operation_code == null
                || input.activity_id == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing execution_id, polygon_id, operation_code or activity_id\"}").build();

        String now = LocalDateTime.now().toString();
        String today = LocalDate.now().toString();

        // Find Exec_Poly-Op entity
        PathElement execSheetAncestor = PathElement.of("ExecutionSheet", input.execution_id);
        String compositeKey = input.execution_id + ":" + input.polygon_id + ":" + input.operation_code;
        Key polyOpKey = datastore.newKeyFactory().setKind("Exec_Poly-Op").addAncestor(execSheetAncestor)
                .newKey(compositeKey);
        Entity polyOpEntity = datastore.get(polyOpKey);
        if (polyOpEntity == null) {
            JsonObject response = new JsonObject();
            response.addProperty("error", "Exec_Poly-Op entity not found for " + compositeKey);
            return Response.status(Response.Status.NOT_FOUND).entity(g.toJson(response)).build();
        }
        String assignedOperator = polyOpEntity.contains("operator_username")
                ? polyOpEntity.getString("operator_username")
                : null;
        if (!user.equals(assignedOperator)) {
            JsonObject response = new JsonObject();
            response.addProperty("error", "Operation " + input.operation_code + " not assigned to you.");
            return Response.ok(g.toJson(response)).build();
        }

        // Find ExecutionActivity by activity_id
        Key activityKey = datastore.newKeyFactory().setKind("ExecutionActivity").addAncestor(execSheetAncestor)
                .newKey(Long.parseLong(input.activity_id));
        Entity activityEntity = datastore.get(activityKey);
        if (activityEntity == null) {
            JsonObject response = new JsonObject();
            response.addProperty("error", "Activity entity not found for id " + input.activity_id);
            return Response.ok(g.toJson(response)).build();
        }
        if (!user.equals(activityEntity.getString("operator_username"))) {
            JsonObject response = new JsonObject();
            response.addProperty("error", "Activity not assigned to you.");
            return Response.ok(g.toJson(response)).build();
        }
        if (!"em_execucao".equals(activityEntity.getString("status"))) {
            JsonObject response = new JsonObject();
            response.addProperty("error", "Activity is not running.");
            return Response.ok(g.toJson(response)).build();
        }

        // Update ExecutionActivity entity
        Entity updatedActivity = Entity.newBuilder(activityEntity)
                .set("end_time", now)
                .set("status", "executado")
                .build();
        datastore.put(updatedActivity);

        // Update status in Exec_Poly-Op
        Entity updatedPolyOp = Entity.newBuilder(polyOpEntity)
                .set("status", "executado")
                .set("finishing_date", today)
                .set("last_activity_date", today)
                .build();
        datastore.put(updatedPolyOp);

        JsonObject response = new JsonObject();
        response.addProperty("message",
                "✅ Stopped activity for " + input.operation_code + " in polygon " + input.polygon_id);
        return Response.ok(g.toJson(response)).build();
    }

    @POST
    @Path("/addInfo")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response addInfoToActivity(@CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader,
            AddInfoToActivityRequest input) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        String user = jwt.getSubject();

        if (!Roles.PO.equalsIgnoreCase(role))
            return forbidden("Only PO can add info");

        if (input == null || input.execution_id == null || input.activity_id == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing execution_id or activity_id\"}").build();

        // Find ExecutionActivity by activity_id
        PathElement execSheetAncestor = PathElement.of("ExecutionSheet", input.execution_id);
        Key activityKey = datastore.newKeyFactory().setKind("ExecutionActivity").addAncestor(execSheetAncestor)
                .newKey(Long.parseLong(input.activity_id));
        Entity activityEntity = datastore.get(activityKey);
        if (activityEntity == null) {
            JsonObject response = new JsonObject();
            response.addProperty("error", "Activity entity not found for id " + input.activity_id);
            return Response.ok(g.toJson(response)).build();
        }
        if (!user.equals(activityEntity.getString("operator_username"))) {
            JsonObject response = new JsonObject();
            response.addProperty("error", "Activity not assigned to you.");
            return Response.ok(g.toJson(response)).build();
        }
        if (!"executado".equals(activityEntity.getString("status"))) {
            JsonObject response = new JsonObject();
            response.addProperty("error", "Activity is not completed.");
            return Response.ok(g.toJson(response)).build();
        }

        // Update ExecutionActivity entity with new info
        Entity.Builder updatedActivityBuilder = Entity.newBuilder(activityEntity);
        if (input.observations != null)
            updatedActivityBuilder.set("observations", input.observations);
        if (input.photo_urls != null)
            updatedActivityBuilder.set("photo_urls", g.toJson(input.photo_urls));
        if (input.tracks != null && !input.tracks.isEmpty())
            updatedActivityBuilder.set("gpx_track", g.toJson(input.tracks.get(0)));
        datastore.put(updatedActivityBuilder.build());

        JsonObject response = new JsonObject();
        response.addProperty("message", "✅ Added info to activity " + input.activity_id);
        return Response.ok(g.toJson(response)).build();
    }

    @GET
    @Path("/status/{executionId}/{operationCode}/{polygonId}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getStatusByParcel(@PathParam("executionId") String executionId,
            @PathParam("operationCode") String operationCode,
            @PathParam("polygonId") String polygonId,
            @CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        if (!Set.of(Roles.PO, Roles.PRBO).contains(role))
            return forbidden("Access denied");

        Query<Entity> query = Query.newEntityQueryBuilder()
                .setKind("ExecutionActivity")
                .setFilter(StructuredQuery.CompositeFilter.and(
                        StructuredQuery.PropertyFilter.eq("execution_id", executionId),
                        StructuredQuery.PropertyFilter.eq("operation_code", operationCode),
                        StructuredQuery.PropertyFilter.eq("polygon_id", polygonId)))
                .build();

        QueryResults<Entity> results = datastore.run(query);
        List<JsonObject> activities = new ArrayList<>();
        int total = 0;
        int completed = 0;

        while (results.hasNext()) {
            Entity e = results.next();
            total++;
            if (e.contains("status") && "executado".equalsIgnoreCase(e.getString("status"))) {
                completed++;
            }
            JsonObject op = new JsonObject();
            op.addProperty("activity_id", String.valueOf(e.getKey().getId()));
            op.addProperty("operation_code", operationCode);
            op.addProperty("status", e.contains("status") ? e.getString("status") : null);
            op.addProperty("starting_date", e.contains("start_time") ? e.getString("start_time") : null);
            op.addProperty("finishing_date", e.contains("end_time") ? e.getString("end_time") : null);
            op.addProperty("observations", e.contains("observations") ? e.getString("observations") : null);
            if (e.contains("gpx_track")) {
                try {
                    op.add("tracks",
                            g.toJsonTree(g.fromJson(e.getString("gpx_track"), ExecutionSheetData.Track[].class)));
                } catch (Exception ignore) {
                }
            }
            activities.add(op);
        }

        JsonObject result = new JsonObject();
        result.addProperty("execution_id", executionId);
        result.addProperty("operation_code", operationCode);
        result.addProperty("polygon_id", polygonId);
        result.addProperty("total_activities", total);
        result.addProperty("completed", completed);
        result.addProperty("percentage", total == 0 ? 0 : (completed * 100 / total));
        result.add("activities", g.toJsonTree(activities));

        return Response.ok(g.toJson(result)).build();
    }

    @GET
    @Path("/status/global/{executionId}/{operationCode}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getGlobalStatus(@PathParam("executionId") String executionId,
            @PathParam("operationCode") String opCode,
            @CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        if (!Set.of(Roles.PRBO, Roles.SDVBO).contains(role))
            return forbidden("Access denied");

        Query<Entity> query = Query.newEntityQueryBuilder()
                .setKind("ExecutionActivity")
                .setFilter(StructuredQuery.CompositeFilter.and(
                        StructuredQuery.PropertyFilter.eq("execution_id", executionId),
                        StructuredQuery.PropertyFilter.eq("operation_code", opCode)))
                .build();

        QueryResults<Entity> results = datastore.run(query);
        List<JsonObject> activities = new ArrayList<>();
        int total = 0;
        int completed = 0;

        while (results.hasNext()) {
            Entity e = results.next();
            total++;
            if (e.contains("status") && "executado".equalsIgnoreCase(e.getString("status"))) {
                completed++;
            }
            JsonObject op = new JsonObject();
            op.addProperty("activity_id", String.valueOf(e.getKey().getId()));
            op.addProperty("operation_code", opCode);
            op.addProperty("polygon_id", e.contains("polygon_id") ? e.getString("polygon_id") : null);
            op.addProperty("status", e.contains("status") ? e.getString("status") : null);
            op.addProperty("starting_date", e.contains("start_time") ? e.getString("start_time") : null);
            op.addProperty("finishing_date", e.contains("end_time") ? e.getString("end_time") : null);
            op.addProperty("observations", e.contains("observations") ? e.getString("observations") : null);
            if (e.contains("gpx_track")) {
                try {
                    op.add("tracks",
                            g.toJsonTree(g.fromJson(e.getString("gpx_track"), ExecutionSheetData.Track[].class)));
                } catch (Exception ignore) {
                }
            }
            activities.add(op);
        }

        JsonObject result = new JsonObject();
        result.addProperty("execution_id", executionId);
        result.addProperty("operation_code", opCode);
        result.addProperty("total_activities", total);
        result.addProperty("completed", completed);
        result.addProperty("percentage", total == 0 ? 0 : (completed * 100 / total));
        result.add("activities", g.toJsonTree(activities));

        return Response.ok(g.toJson(result)).build();
    }

    @POST
    @Path("/export")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    public Response exportExecutionSheet(@CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader,
            JsonObject input) {

        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        if (!Roles.SDVBO.equalsIgnoreCase(role))
            return forbidden("Only SDVBO can export execution sheets.");

        if (!input.has("worksheet_id"))
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing worksheet_id\"}").build();

        String worksheetId = input.get("worksheet_id").getAsString();
        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(worksheetId);
        Entity execSheet = datastore.get(execKey);
        if (execSheet == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Execution sheet not found\"}").build();

        // Recolher dados simples
        JsonObject export = new JsonObject();
        export.addProperty("id", Long.parseLong(worksheetId));
        export.addProperty("starting_date", execSheet.getString("starting_date"));
        if (execSheet.contains("finishing_date"))
            export.addProperty("finishing_date", execSheet.getString("finishing_date"));
        if (execSheet.contains("last_activity_date"))
            export.addProperty("last_activity_date", execSheet.getString("last_activity_date"));
        if (execSheet.contains("observations"))
            export.addProperty("observations", execSheet.getString("observations"));

        // operations (área executada, etc.)
        JsonArray operations = JsonParser.parseString(execSheet.getString("operations")).getAsJsonArray();
        export.add("operations", operations);

        // polygons_operations
        Type polyListType = new TypeToken<List<ExecutionSheetData.PolygonOperations>>() {
        }.getType();
        List<ExecutionSheetData.PolygonOperations> polygonOps = g.fromJson(execSheet.getString("polygons_operations"),
                polyListType);

        JsonArray polygonOpsArray = new JsonArray();
        for (ExecutionSheetData.PolygonOperations poly : polygonOps) {
            JsonObject polyJson = new JsonObject();
            polyJson.addProperty("polygon_id", poly.polygon_id);

            JsonArray opArray = new JsonArray();
            for (ExecutionSheetData.PolygonOperation op : poly.operations) {
                JsonObject opJson = new JsonObject();
                opJson.addProperty("operation_id", op.operation_id);
                opJson.addProperty("status", op.status != null ? op.status : "unassigned");
                if (op.starting_date != null)
                    opJson.addProperty("starting_date", op.starting_date);
                if (op.finishing_date != null)
                    opJson.addProperty("finishing_date", op.finishing_date);
                if (op.last_activity_date != null)
                    opJson.addProperty("last_activity_date", op.last_activity_date);
                if (op.observations != null)
                    opJson.addProperty("observations", op.observations);

                // tracks
                if (op.tracks != null && !op.tracks.isEmpty()) {
                    JsonArray trackArray = new JsonArray();
                    for (ExecutionSheetData.Track t : op.tracks) {
                        JsonObject trackJson = new JsonObject();
                        trackJson.addProperty("type", t.type);
                        JsonArray coords = new JsonArray();
                        for (List<Double> point : t.coordinates) {
                            JsonArray coordPair = new JsonArray();
                            coordPair.add(point.get(0));
                            coordPair.add(point.get(1));
                            coords.add(coordPair);
                        }
                        trackJson.add("coordinates", coords);
                        trackArray.add(trackJson);
                    }
                    opJson.add("tracks", trackArray);
                }

                opArray.add(opJson);
            }

            polyJson.add("operations", opArray);
            polygonOpsArray.add(polyJson);
        }

        export.add("polygons_operations", polygonOpsArray);
        return Response.ok(g.toJson(export)).build();
    }

    @GET
    @Path("/viewActiveOperation/{worksheetId}/{polygonId}/{operationCode}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response viewActiveOperation(
            @PathParam("worksheetId") String worksheetId,
            @PathParam("polygonId") String polygonId,
            @PathParam("operationCode") String operationCode,
            @CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader) {

        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return unauthorized("Invalid session");
        }

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) {
            return unauthorized("Failed to decode token");
        }

        String role = jwt.getClaim("role").asString();
        if (!Set.of(Roles.PRBO, Roles.PO).contains(role)) {
            return forbidden("Access denied");
        }

        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(worksheetId);
        Entity execSheet = datastore.get(execKey);
        if (execSheet == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Execution sheet not found\"}").build();
        }

        Type listType = new TypeToken<List<ExecutionSheetData.PolygonOperations>>() {
        }.getType();
        List<ExecutionSheetData.PolygonOperations> sheetData = g.fromJson(execSheet.getString("polygons_operations"),
                listType);

        ExecutionSheetData.PolygonOperation result = null;
        for (ExecutionSheetData.PolygonOperations polyOps : sheetData) {
            for (ExecutionSheetData.PolygonOperation op : polyOps.operations) {
                if (op.operation_code.equalsIgnoreCase(operationCode)) {
                    result = op;
                    break;
                }
            }
            if (result != null)
                break;
        }

        if (result == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Operation not found in specified polygon\"}").build();
        }

        if (Roles.PO.equalsIgnoreCase(role)) {
            String currentUser = jwt.getSubject();
            if (!currentUser.equals(result.operator_username)) {
                return forbidden("You can only view operations assigned to you");
            }
        }

        JsonObject response = new JsonObject();
        response.addProperty("worksheet_id", worksheetId);
        response.addProperty("polygon_id", polygonId);
        response.addProperty("operation_code", result.operation_code);
        response.addProperty("operation_id", result.operation_id);
        response.addProperty("status", result.status);
        response.addProperty("operator_username", result.operator_username);
        response.addProperty("starting_date", result.starting_date);
        response.addProperty("finishing_date", result.finishing_date == null ? "not finished" : result.finishing_date);
        response.addProperty("last_activity_date", result.last_activity_date);

        if (result.activities != null && !result.activities.isEmpty()) {
            JsonArray activitiesJson = new JsonArray();
            for (ExecutionSheetData.Activity activity : result.activities) {
                JsonObject activityJson = new JsonObject();
                activityJson.addProperty("activity_id", activity.activity_id);
                activityJson.addProperty("start_time", activity.start_time);
                activityJson.addProperty("end_time", activity.end_time);
                activityJson.addProperty("observations", activity.observations);
                activitiesJson.add(activityJson);
            }
            response.add("activities", activitiesJson);
        }

        return Response.ok(g.toJson(response)).build();
    }

    @POST
    @Path("/editOperation")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response editOperationDetails(@CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader,
            EditOperationRequest input) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        if (!Roles.PRBO.equalsIgnoreCase(role) && !Roles.SDVBO.equalsIgnoreCase(role))
            return forbidden("Only PRBO or SDVBO can edit operations");

        if (input == null || input.execution_id == null || input.operation == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing execution_id or operation object\"}").build();

        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(input.execution_id);
        Entity execSheet = datastore.get(execKey);
        if (execSheet == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Execution sheet not found\"}").build();

        // Only update top-level fields in ExecutionSheet entity
        Entity.Builder updatedBuilder = Entity.newBuilder(execSheet.getKey())
                .set("worksheet_id", execSheet.getString("worksheet_id"))
                .set("created_by", execSheet.getString("created_by"))
                .set("created_at", execSheet.getLong("created_at"));

        // Update expected fields if present in input.operation
        if (input.operation.expected_duration_hours != null)
            updatedBuilder.set("expected_duration_hours", input.operation.expected_duration_hours);
        if (input.operation.expected_finish_date != null)
            updatedBuilder.set("expected_finish_date", input.operation.expected_finish_date);
        // Add other editable fields as needed

        // Preserve other fields
        if (execSheet.contains("starting_date"))
            updatedBuilder.set("starting_date", execSheet.getString("starting_date"));
        if (execSheet.contains("finishing_date"))
            updatedBuilder.set("finishing_date", execSheet.getString("finishing_date"));
        if (execSheet.contains("observations"))
            updatedBuilder.set("observations", execSheet.getString("observations"));
        if (execSheet.contains("operations"))
            updatedBuilder.set("operations", execSheet.getString("operations"));

        Entity updated = updatedBuilder.build();
        datastore.put(updated);

        JsonObject response = new JsonObject();
        response.addProperty("message", "Operation details updated in ExecutionSheet entity.");
        return Response.ok(g.toJson(response)).build();
    }

    @POST
    @Path("/notify/out")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response notifyOperatorOutOfArea(Map<String, String> input) {
        String operatorId = input.get("operator_id");
        String worksheetId = input.get("worksheet_id");
        String polygonId = input.get("polygon_id");
        LOG.info("[NOTIFY-OUT] Operator " + operatorId + " is out of the area (polygon " + polygonId
                + ") for worksheet " + worksheetId);
        return Response.ok("{\"message\":\"Notification registered for operator out of area.\"}").build();
    }

    @POST
    @Path("/notify/polyEnd")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response notifyOperationCompletedInParcel(Map<String, String> input) {
        String operation = input.get("operation_code");
        String worksheetId = input.get("worksheet_id");
        String polygonId = input.get("polygon_id");
        LOG.info("[NOTIFY-OPER-POLY-END] Operation " + operation + " completed in polygon " + polygonId
                + " of worksheet " + worksheetId);
        return Response.ok("{\"message\":\"Notification registered for parcel operation completion.\"}").build();
    }

    @POST
    @Path("/notify/operationEnd")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response notifyOperationCompletedAllParcels(Map<String, String> input) {
        String operation = input.get("operation_code");
        String worksheetId = input.get("worksheet_id");
        LOG.info("[NOTIFY-OPER-END] Operation " + operation + " completed in ALL parcels of worksheet " + worksheetId);
        return Response.ok("{\"message\":\"Notification registered for operation completion in all parcels.\"}")
                .build();
    }

    private String nvl(String s) {
        return s == null ? "" : s;
    }

    private String nvl(String s, String def) {
        return s == null ? def : s;
    }
}
