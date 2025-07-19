package pt.unl.fct.di.apdc.userapp.resources;

import java.io.InputStream;
import java.lang.reflect.Type;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Logger;

import org.glassfish.jersey.media.multipart.FormDataContentDisposition;
import org.glassfish.jersey.media.multipart.FormDataParam;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.google.cloud.Timestamp;
import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.DatastoreOptions;
import com.google.cloud.datastore.Entity;
import com.google.cloud.datastore.Key;
import com.google.cloud.datastore.PathElement;
import com.google.cloud.datastore.Query;
import com.google.cloud.datastore.QueryResults;
import com.google.cloud.datastore.StructuredQuery;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
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
import pt.unl.fct.di.apdc.userapp.util.execution.AssignOperationRequest.PolygonOperationAssignment;
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
            String polygonId = props.get("polygon_id").getAsString();

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

        String operatorUsername = input.operator_username;

        for (PolygonOperationAssignment assign : input.polygon_operations) {
            if (assign == null || assign.polygon_id == null || assign.operation_code == null) {
                debugOutput.add("⚠️ Missing fields in polygon_operations object.");
                continue;
            }
            String polygonId = assign.polygon_id;
            String operationCode = assign.operation_code;

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

        if (input == null || input.execution_id == null || input.polygon_id == null || input.operation_code == null)
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

        // Create ExecutionActivity with UUID key
        String uuid = UUID.randomUUID().toString();
        Key activityKey = datastore.newKeyFactory()
                .setKind("ExecutionActivity")
                .addAncestor(execSheetAncestor)
                .newKey(uuid);

        Entity activityEntity = Entity.newBuilder(activityKey)
                .set("execution_id", input.execution_id)
                .set("polygon_id", input.polygon_id)
                .set("operation_code", input.operation_code)
                .set("operator_username", user)
                .set("start_time", now)
                .set("status", "em_execucao")
                .build();
        datastore.put(activityEntity);

        // Update Exec_Poly-Op: add activity UUID to list
        List<String> activities = new ArrayList<>();
        if (polyOpEntity.contains("activities")) {
            try {
                java.lang.reflect.Type listType = new com.google.gson.reflect.TypeToken<List<String>>() {
                }.getType();
                activities = g.fromJson(polyOpEntity.getString("activities"), listType);
                if (activities == null)
                    activities = new ArrayList<>();
            } catch (Exception ex) {
                LOG.warning("⚠️ Failed to parse existing activities list: " + ex.getMessage());
            }
        }
        activities.add(uuid);

        Entity.Builder updatedBuilder = Entity.newBuilder(polyOpEntity)
                .set("status", "em_execucao")
                .set("starting_date", now)
                .set("last_activity_date", now)
                .set("activities", g.toJson(activities));

        // Preserve existing fields
        if (polyOpEntity.contains("operation_code"))
            updatedBuilder.set("operation_code", polyOpEntity.getString("operation_code"));
        if (polyOpEntity.contains("polygon_id"))
            updatedBuilder.set("polygon_id", polyOpEntity.getString("polygon_id"));
        if (polyOpEntity.contains("execution_id"))
            updatedBuilder.set("execution_id", polyOpEntity.getString("execution_id"));
        if (polyOpEntity.contains("operator_username"))
            updatedBuilder.set("operator_username", polyOpEntity.getString("operator_username"));
        if (polyOpEntity.contains("operation_id"))
            updatedBuilder.set("operation_id", polyOpEntity.getLong("operation_id"));
        if (polyOpEntity.contains("observations"))
            updatedBuilder.set("observations", polyOpEntity.getString("observations"));

        datastore.put(updatedBuilder.build());

        JsonObject response = new JsonObject();
        response.addProperty("message",
                "✅ Started activity " + input.operation_code + " in polygon " + input.polygon_id);
        response.addProperty("activity_id", uuid);
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

        if (input == null || input.execution_id == null || input.polygon_id == null
                || input.operation_code == null || input.activity_id == null)
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

        // Find ExecutionActivity by UUID
        Key activityKey = datastore.newKeyFactory()
                .setKind("ExecutionActivity")
                .addAncestor(execSheetAncestor)
                .newKey(input.activity_id);
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
        Entity.Builder updatedBuilder = Entity.newBuilder(polyOpEntity)
                .set("status", "executado")
                .set("finishing_date", today)
                .set("last_activity_date", today);

        // Preserve optional fields
        if (polyOpEntity.contains("activities"))
            updatedBuilder.set("activities", polyOpEntity.getString("activities"));
        if (polyOpEntity.contains("operation_code"))
            updatedBuilder.set("operation_code", polyOpEntity.getString("operation_code"));
        if (polyOpEntity.contains("polygon_id"))
            updatedBuilder.set("polygon_id", polyOpEntity.getString("polygon_id"));
        if (polyOpEntity.contains("execution_id"))
            updatedBuilder.set("execution_id", polyOpEntity.getString("execution_id"));
        if (polyOpEntity.contains("operator_username"))
            updatedBuilder.set("operator_username", polyOpEntity.getString("operator_username"));
        if (polyOpEntity.contains("operation_id"))
            updatedBuilder.set("operation_id", polyOpEntity.getLong("operation_id"));
        if (polyOpEntity.contains("observations"))
            updatedBuilder.set("observations", polyOpEntity.getString("observations"));

        datastore.put(updatedBuilder.build());

        JsonObject response = new JsonObject();
        response.addProperty("message",
                "✅ Stopped activity for " + input.operation_code + " in polygon " + input.polygon_id);
        return Response.ok(g.toJson(response)).build();
    }

    @POST
    @Path("/addInfo")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response addInfoToActivity(
            @CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader,
            @FormDataParam("data") String dataJson,
            @FormDataParam("photos") List<InputStream> photoStreams,
            @FormDataParam("photos") List<FormDataContentDisposition> photoDetails) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        String user = jwt.getSubject();

        AddInfoToActivityRequest input;
        try {
            input = g.fromJson(dataJson, AddInfoToActivityRequest.class);
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Invalid data JSON: " + e.getMessage() + "\"}").build();
        }

        if (!Roles.PO.equalsIgnoreCase(role))
            return forbidden("Only PO can add info");

        if (input == null || input.execution_id == null || input.activity_id == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing execution_id or activity_id\"}").build();

        // Find ExecutionActivity by activity_id
        PathElement execSheetAncestor = PathElement.of("ExecutionSheet", input.execution_id);
        Key activityKey = datastore.newKeyFactory().setKind("ExecutionActivity").addAncestor(execSheetAncestor)
                .newKey(input.activity_id);
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

        // Handle photo uploads to GCS
        java.util.List<String> uploadedPhotoUrls = new java.util.ArrayList<>();
        if (photoStreams != null && photoDetails != null && photoStreams.size() == photoDetails.size()) {
            String bucketName = "alien-iterator-460014-a0.appspot.com";
            Storage storage = StorageOptions.getDefaultInstance().getService();
            for (int i = 0; i < photoStreams.size(); i++) {
                InputStream stream = photoStreams.get(i);
                FormDataContentDisposition detail = photoDetails.get(i);
                String fileName = "activity_photos/" + input.activity_id + "_" + java.util.UUID.randomUUID() + "_"
                        + detail.getFileName();
                BlobInfo blobInfo = BlobInfo.newBuilder(bucketName, fileName)
                        .setContentType(detail.getType())
                        .setAcl(java.util.Arrays.asList(
                                com.google.cloud.storage.Acl.of(com.google.cloud.storage.Acl.User.ofAllUsers(),
                                        com.google.cloud.storage.Acl.Role.READER)))
                        .build();
                try (java.nio.channels.WritableByteChannel channel = storage.writer(blobInfo)) {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = stream.read(buffer)) != -1) {
                        channel.write(java.nio.ByteBuffer.wrap(buffer, 0, bytesRead));
                    }
                } catch (Exception e) {
                    LOG.warning("Failed to upload activity photo: " + e.getMessage());
                    continue;
                }
                String url = String.format("https://storage.googleapis.com/%s/%s", bucketName, fileName);
                uploadedPhotoUrls.add(url);
            }
        }

        // Merge provided photo_urls (JSON array) with uploaded ones
        java.util.List<String> allPhotoUrls = new java.util.ArrayList<>(uploadedPhotoUrls);
        if (input.photo_urls != null) {
            try {
                java.util.List<String> providedUrls = input.photo_urls;
                if (providedUrls != null)
                    allPhotoUrls.addAll(providedUrls);
            } catch (Exception e) {
                LOG.warning("Failed to parse photo_urls: " + e.getMessage());
            }
        }

        // Update ExecutionActivity entity with new info
        Entity.Builder updatedActivityBuilder = Entity.newBuilder(activityEntity);
        if (input.observations != null)
            updatedActivityBuilder.set("observations", input.observations);
        if (!allPhotoUrls.isEmpty())
            updatedActivityBuilder.set("photo_urls", g.toJson(allPhotoUrls));
        if (input.tracks != null && !input.tracks.isEmpty())
            updatedActivityBuilder.set("gpx_track", g.toJson(input.tracks.get(0)));
        datastore.put(updatedActivityBuilder.build());

        JsonObject response = new JsonObject();
        response.addProperty("message", "✅ Added info to activity " + input.activity_id);
        response.add("photo_urls", g.toJsonTree(allPhotoUrls));
        return Response.ok(g.toJson(response)).build();
    }

    @GET
    @Path("/getExecution/{executionId}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getExecution(
            @CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader,
            @PathParam("executionId") String executionId) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        if (!Set.of(Roles.PRBO, Roles.SDVBO, Roles.SMBO).contains(role))
            return forbidden("Access denied");

        if (executionId == null || executionId.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing executionId\"}").build();
        }

        try {
            Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(executionId);
            Entity execEntity = datastore.get(execKey);
            if (execEntity == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("{\"error\":\"Execution sheet not found\"}").build();
            }

            JsonObject result = new JsonObject();
            result.addProperty("execution_id", execEntity.getKey().getName());
            result.addProperty("worksheet_id", execEntity.getString("worksheet_id"));
            result.addProperty("created_by", execEntity.getString("created_by"));
            result.addProperty("created_at", execEntity.getLong("created_at"));
            result.addProperty("starting_date", execEntity.getString("starting_date"));
            result.addProperty("finishing_date", execEntity.getString("finishing_date"));
            result.addProperty("observations", execEntity.getString("observations"));

            String operationsJson = execEntity.contains("operations") ? execEntity.getString("operations") : "[]";
            result.add("operations", JsonParser.parseString(operationsJson));

            Query<Entity> query = Query.newEntityQueryBuilder()
                    .setKind("Exec_Poly-Op")
                    .setFilter(StructuredQuery.PropertyFilter.eq("execution_id", executionId))
                    .build();
            QueryResults<Entity> results = datastore.run(query);
            JsonArray polygonOperations = new JsonArray();

            while (results.hasNext()) {
                Entity polygonOpEntity = results.next();
                JsonObject polygonOpJson = new JsonObject();

                polygonOpJson.addProperty("operation_code", polygonOpEntity.getString("operation_code"));
                polygonOpJson.addProperty("polygon_id", polygonOpEntity.getString("polygon_id"));
                polygonOpJson.addProperty("status", polygonOpEntity.getString("status"));

                Query<Entity> activityQuery = Query.newEntityQueryBuilder()
                        .setKind("ExecutionActivity")
                        .setFilter(StructuredQuery.CompositeFilter.and(
                                StructuredQuery.PropertyFilter.eq("execution_id", executionId),
                                StructuredQuery.PropertyFilter.eq("polygon_id",
                                        polygonOpEntity.getString("polygon_id")),
                                StructuredQuery.PropertyFilter.eq("operation_code",
                                        polygonOpEntity.getString("operation_code"))))
                        .build();
                QueryResults<Entity> activityResults = datastore.run(activityQuery);

                JsonArray activities = new JsonArray();
                while (activityResults.hasNext()) {
                    Entity activityEntity = activityResults.next();
                    JsonObject activityJson = new JsonObject();
                    activityJson.addProperty("activity_id", String.valueOf(activityEntity.getKey().getId()));
                    if (activityEntity.contains("status"))
                        activityJson.addProperty("status", activityEntity.getString("status"));
                    if (activityEntity.contains("start_time"))
                        activityJson.addProperty("start_time", activityEntity.getString("start_time"));
                    if (activityEntity.contains("end_time"))
                        activityJson.addProperty("end_time", activityEntity.getString("end_time"));
                    if (activityEntity.contains("observations"))
                        activityJson.addProperty("observations", activityEntity.getString("observations"));
                    if (activityEntity.contains("gpx_track")) {
                        try {
                            ExecutionSheetData.Track[] tracks = g.fromJson(
                                    activityEntity.getString("gpx_track"),
                                    ExecutionSheetData.Track[].class);
                            activityJson.add("tracks", g.toJsonTree(tracks));
                        } catch (Exception e) {
                            LOG.warning("Error parsing GPX track: " + e.getMessage());
                        }
                    }
                    activities.add(activityJson);
                }

                polygonOpJson.add("activities", activities);
                polygonOperations.add(polygonOpJson);
            }

            result.add("polygon_operations", polygonOperations);
            return Response.ok(g.toJson(result)).build();

        } catch (Exception ex) {
            LOG.severe("Error in getExecution: " + ex.getMessage());
            return Response.serverError().entity("{\"error\":\"" + ex.getMessage() + "\"}").build();
        }
    }

    @GET
    @Path("/status/poly-op/{executionId}/{polygonId}/{operationCode}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getActivitiesForPolygonOperation(@PathParam("executionId") String executionId,
            @PathParam("polygonId") long polygonId,
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
        if (!Set.of(Roles.PRBO, Roles.PO).contains(role))
            return forbidden("Access denied");

        if (executionId == null || opCode == null || polygonId <= 0)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing required parameters.\"}").build();

        Query<Entity> query = Query.newEntityQueryBuilder()
                .setKind("ExecutionActivity")
                .setFilter(StructuredQuery.CompositeFilter.and(
                        StructuredQuery.PropertyFilter.eq("execution_id", executionId),
                        StructuredQuery.PropertyFilter.eq("operation_code", opCode),
                        StructuredQuery.PropertyFilter.eq("polygon_id", polygonId)))
                .build();

        QueryResults<Entity> results = datastore.run(query);
        JsonArray activities = new JsonArray();

        while (results.hasNext()) {
            Entity e = results.next();
            JsonObject obj = new JsonObject();
            obj.addProperty("activity_id", e.getKey().getId());
            obj.addProperty("operation_code", opCode);
            obj.addProperty("polygon_id", polygonId);
            obj.addProperty("status", e.contains("status") ? e.getString("status") : null);
            obj.addProperty("starting_date", e.contains("start_time") ? e.getString("start_time") : null);
            obj.addProperty("finishing_date", e.contains("end_time") ? e.getString("end_time") : null);
            obj.addProperty("observations", e.contains("observations") ? e.getString("observations") : null);

            if (e.contains("gpx_track")) {
                try {
                    obj.add("tracks", g.toJsonTree(
                            g.fromJson(e.getString("gpx_track"), ExecutionSheetData.Track[].class)));
                } catch (Exception ignore) {
                }
            }

            activities.add(obj);
        }

        return Response.ok(g.toJson(activities)).build();
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

        if (executionId == null || executionId.isEmpty() || opCode == null || opCode.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing executionId or operationCode\"}").build();
        }

        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(executionId);
        Entity execSheet = datastore.get(execKey);
        if (execSheet == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Execution sheet not found\"}").build();

        if (!execSheet.contains("operations") || !execSheet.getString("operations").contains(opCode))
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Operation code not found in execution sheet\"}").build();

        JsonArray operationsArray = JsonParser.parseString(execSheet.getString("operations")).getAsJsonArray();
        ExecutionSheetData.Operation operation = null;
        double totalArea = 0.0;
        double executedArea = 0.0;
        String finishDate = null;
        String observations = null;
        String startDate = null;

        for (JsonElement opElem : operationsArray) {
            JsonObject opObj = opElem.getAsJsonObject();
            if (opObj.has("operation_code") && opObj.get("operation_code").getAsString().equals(opCode)) {
                operation = g.fromJson(opObj, ExecutionSheetData.Operation.class);
                if (opObj.has("area_ha_executed"))
                    executedArea = opObj.get("area_ha_executed").getAsDouble();
                if (opObj.has("area_perc") && opObj.get("area_perc").getAsDouble() > 0)
                    totalArea = executedArea * 100 / opObj.get("area_perc").getAsDouble();
                if (opObj.has("finishing_date"))
                    finishDate = opObj.get("finishing_date").getAsString();
                if (opObj.has("observations"))
                    observations = opObj.get("observations").getAsString();
                if (opObj.has("starting_date"))
                    startDate = opObj.get("starting_date").getAsString();
                break;
            }
        }

        if (operation == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Operation code not found in execution sheet operations\"}").build();

        // fallback para start_date se não estiver no JSON
        if (startDate == null)
            startDate = execSheet.contains("starting_date") ? execSheet.getString("starting_date") : null;

        String lastActivityDate = null;

        Query<Entity> query = Query.newEntityQueryBuilder()
                .setKind("ExecutionActivity")
                .setFilter(StructuredQuery.CompositeFilter.and(
                        StructuredQuery.PropertyFilter.eq("execution_id", executionId),
                        StructuredQuery.PropertyFilter.eq("operation_code", opCode)))
                .build();

        QueryResults<Entity> results = datastore.run(query);
        List<JsonObject> activities = new ArrayList<>();
        int total = 0, completed = 0;

        while (results.hasNext()) {
            Entity e = results.next();
            total++;
            if (e.contains("status") && "executado".equalsIgnoreCase(e.getString("status")))
                completed++;

            JsonObject act = new JsonObject();
            act.addProperty("activity_id", String.valueOf(e.getKey().getId()));
            act.addProperty("operation_code", opCode);
            act.addProperty("polygon_id", e.contains("polygon_id") ? String.valueOf(e.getLong("polygon_id")) : null);
            act.addProperty("status", e.contains("status") ? e.getString("status") : null);
            act.addProperty("starting_date", e.contains("start_time") ? e.getString("start_time") : null);
            act.addProperty("finishing_date", e.contains("end_time") ? e.getString("end_time") : null);
            act.addProperty("observations", e.contains("observations") ? e.getString("observations") : null);

            if (e.contains("gpx_track")) {
                try {
                    act.add("tracks", g.toJsonTree(
                            g.fromJson(e.getString("gpx_track"), ExecutionSheetData.Track[].class)));
                } catch (Exception ignore) {
                }
            }

            activities.add(act);

            // calcular última atividade
            String activityDate = e.contains("end_time") ? e.getString("end_time")
                    : e.contains("start_time") ? e.getString("start_time") : null;

            if (activityDate != null && (lastActivityDate == null || activityDate.compareTo(lastActivityDate) > 0))
                lastActivityDate = activityDate;
        }

        JsonObject result = new JsonObject();
        result.addProperty("execution_id", executionId);
        result.addProperty("operation_code", opCode);
        result.addProperty("start_time", startDate);
        result.addProperty("last_activity_date", lastActivityDate);
        result.addProperty("total_area", totalArea);
        result.addProperty("executed_area", executedArea);
        result.addProperty("executed_area_percent", totalArea == 0 ? 0 : (executedArea * 100 / totalArea));
        result.addProperty("finish_date", finishDate);
        result.addProperty("observations", observations);
        result.addProperty("total_activities", total);
        result.addProperty("completed", completed);
        result.addProperty("percentage", total == 0 ? 0 : (completed * 100 / total));
        result.add("activities", g.toJsonTree(activities));

        return Response.ok(g.toJson(result)).build();
    }

    @GET
    @Path("/export/{executionId}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response exportExecutionSheet(@CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader,
            @PathParam("executionId") String executionId) {

        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        if (!Roles.SDVBO.equalsIgnoreCase(role))
            return forbidden("Only SDVBO can export execution sheets.");

        if (executionId == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing executionId\"}").build();

        try {
            Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(executionId);
            Entity execSheet = datastore.get(execKey);
            if (execSheet == null)
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("{\"error\":\"Execution sheet not found\"}").build();

            JsonObject export = new JsonObject();
            export.addProperty("id", Long.parseLong(executionId));
            export.addProperty("starting_date", execSheet.getString("starting_date"));

            if (execSheet.contains("finishing_date"))
                export.addProperty("finishing_date", execSheet.getString("finishing_date"));
            if (execSheet.contains("last_activity_date"))
                export.addProperty("last_activity_date", execSheet.getString("last_activity_date"));
            if (execSheet.contains("observations"))
                export.addProperty("observations", execSheet.getString("observations"));

            // OPERATIONS
            JsonArray opsArray = new JsonArray();
            JsonArray rawOps = JsonParser.parseString(execSheet.getString("operations")).getAsJsonArray();

            for (JsonElement elem : rawOps) {
                JsonObject rawOp = elem.getAsJsonObject();

                if (!rawOp.has("operation_code") || !rawOp.has("area_ha")) {
                    LOG.warning("[EXPORT] Skipping operation (missing code or area): " + rawOp);
                    continue;
                }

                JsonObject op = new JsonObject();
                op.addProperty("operation_code", rawOp.get("operation_code").getAsString());

                // Reaproveita area_ha como area_ha_executed (simboliza área feita até agora)
                op.addProperty("area_ha_executed", rawOp.get("area_ha").getAsDouble());

                // Default area_perc (ex: 100%) — podes adaptar conforme o modelo
                double area = rawOp.get("area_ha").getAsDouble();
                double perc = 100.0;
                op.addProperty("area_perc", perc);

                // Usa data estimada ou coloca uma por defeito
                if (rawOp.has("expected_finish_date"))
                    op.addProperty("finishing_date", rawOp.get("expected_finish_date").getAsString());

                // Usa estimativa de arranque default (podes depois parametrizar isto)
                op.addProperty("starting_date", "2025-06-01");

                if (rawOp.has("observations"))
                    op.addProperty("observations", rawOp.get("observations").getAsString());

                opsArray.add(op);
            }

            if (opsArray.size() == 0) {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity("{\"error\":\"Export failed: no valid operations matching schema\"}").build();
            }

            export.add("operations", opsArray);

            // POLYGONS_OPERATIONS
            JsonArray polygons = new JsonArray();
            Query<Entity> polyOpsQuery = Query.newEntityQueryBuilder()
                    .setKind("Exec_Poly-Op")
                    .setFilter(StructuredQuery.PropertyFilter.eq("execution_id", executionId))
                    .build();
            QueryResults<Entity> polyOpsResults = datastore.run(polyOpsQuery);

            Map<String, JsonObject> polygonMap = new HashMap<>();

            while (polyOpsResults.hasNext()) {
                Entity e = polyOpsResults.next();

                try {
                    int polygonId = Integer.parseInt(e.getString("polygon_id"));
                    String opCode = e.getString("operation_code");

                    JsonObject operation = new JsonObject();
                    operation.addProperty("operation_id", e.getLong("operation_id"));
                    operation.addProperty("status", e.getString("status"));

                    if (e.contains("starting_date"))
                        operation.addProperty("starting_date", e.getString("starting_date"));
                    if (e.contains("finishing_date"))
                        operation.addProperty("finishing_date", e.getString("finishing_date"));
                    if (e.contains("last_activity_date"))
                        operation.addProperty("last_activity_date", e.getString("last_activity_date"));
                    if (e.contains("observations"))
                        operation.addProperty("observations", e.getString("observations"));

                    JsonArray tracks = new JsonArray();
                    Query<Entity> actQuery = Query.newEntityQueryBuilder()
                            .setKind("ExecutionActivity")
                            .setFilter(StructuredQuery.CompositeFilter.and(
                                    StructuredQuery.PropertyFilter.eq("execution_id", executionId),
                                    StructuredQuery.PropertyFilter.eq("polygon_id", e.getString("polygon_id")),
                                    StructuredQuery.PropertyFilter.eq("operation_code", opCode)))
                            .build();

                    QueryResults<Entity> activities = datastore.run(actQuery);
                    while (activities.hasNext()) {
                        Entity act = activities.next();
                        if (act.contains("gpx_track")) {
                            try {
                                JsonArray actTracks = g.toJsonTree(
                                        g.fromJson(act.getString("gpx_track"),
                                                ExecutionSheetData.Track[].class))
                                        .getAsJsonArray();
                                for (JsonElement t : actTracks)
                                    tracks.add(t);
                            } catch (Exception ex) {
                                LOG.warning("Failed to parse gpx_track: " + ex.getMessage());
                            }
                        }
                    }

                    operation.add("tracks", tracks);

                    String polyKey = String.valueOf(polygonId);
                    JsonObject polygon = polygonMap.getOrDefault(polyKey, new JsonObject());
                    polygon.addProperty("polygon_id", polygonId);
                    JsonArray polyOps = polygon.has("operations") ? polygon.getAsJsonArray("operations")
                            : new JsonArray();
                    polyOps.add(operation);
                    polygon.add("operations", polyOps);
                    polygonMap.put(polyKey, polygon);
                } catch (Exception e1) {
                    LOG.warning("[EXPORT] Skipping polygon-operation due to parse error: " + e1.getMessage());
                }
            }

            for (JsonObject polygon : polygonMap.values()) {
                polygons.add(polygon);
            }

            export.add("polygons_operations", polygons);
            LOG.info("[EXPORT] Export completed successfully for executionId=" + executionId);
            return Response.ok(g.toJson(export)).build();

        } catch (Exception ex) {
            LOG.severe("[EXPORT] Unexpected server error: " + ex.getMessage());
            return Response.serverError().entity("{\"error\":\"Export failed: " + ex.getMessage() + "\"}").build();
        }
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
    @Produces(MediaType.APPLICATION_JSON)
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

        if (input == null || input.execution_id == null || input.operation == null
                || input.operation.operation_code == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing required operation data\"}").build();
        }

        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(input.execution_id);
        Entity execSheet = datastore.get(execKey);
        if (execSheet == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Execution sheet not found\"}").build();

        // Atualizar a operação dentro do array
        JsonArray operationsArray = JsonParser.parseString(execSheet.getString("operations")).getAsJsonArray();
        boolean found = false;

        for (JsonElement elem : operationsArray) {
            JsonObject op = elem.getAsJsonObject();
            if (op.get("operation_code").getAsString().equals(input.operation.operation_code)) {
                if (input.operation.expected_duration_hours != null)
                    op.addProperty("expected_duration_hours", input.operation.expected_duration_hours);
                if (input.operation.expected_start_date != null)
                    op.addProperty("expected_start_date", input.operation.expected_start_date);
                if (input.operation.expected_finish_date != null)
                    op.addProperty("expected_finish_date", input.operation.expected_finish_date);
                if (input.operation.observations != null)
                    op.addProperty("observations", input.operation.observations);
                found = true;
                break;
            }
        }

        if (!found) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Operation code not found in execution sheet.\"}").build();
        }

        Entity updated = Entity.newBuilder(execSheet)
                .set("operations", operationsArray.toString()) // substitui array modificado
                .build();

        datastore.put(updated);

        JsonObject response = new JsonObject();
        response.addProperty("message", "Operation updated successfully.");
        return Response.ok(g.toJson(response)).build();
    }

    @POST
    @Path("/notify/out")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response notifyOperatorOutOfArea(Map<String, String> input) {
        String operatorId = input.get("operator_id");
        String worksheetId = input.get("worksheet_id");
        String polygonId = input.get("polygon_id");

        if (operatorId == null || worksheetId == null || polygonId == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing required fields.\"}").build();
        }

        Entity notification = Entity.newBuilder(datastore.allocateId(
                datastore.newKeyFactory().setKind("Notification").newKey()))
                .set("type", "OUT_OF_AREA")
                .set("operator_id", operatorId)
                .set("worksheet_id", worksheetId)
                .set("polygon_id", polygonId)
                .set("timestamp", Timestamp.now())
                .build();

        datastore.put(notification);

        LOG.info("[NOTIFY-OUT] Operator " + operatorId + " out of polygon " + polygonId + " in worksheet "
                + worksheetId);
        return Response.ok("{\"message\":\"Notification stored.\"}").build();
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

    @GET
    @Path("/getConcludedActivities/{executionId}/{operatorName}")
    public Response getConcludedActivities(
            @PathParam("executionId") String executionId,
            @PathParam("operatorName") String operatorName,
            @CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader) {
        LOG.info("[GET-CONCLUDED-ACTIVITIES] Fetching concluded activities for execution " + executionId
                + " and operator " + operatorName);

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

        if (executionId == null || executionId.isEmpty() || operatorName == null || operatorName.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing executionId or operatorName\"}").build();
        }

        Query<Entity> query = Query.newEntityQueryBuilder()
                .setKind("ExecutionActivity")
                .setFilter(StructuredQuery.CompositeFilter.and(
                        StructuredQuery.PropertyFilter.eq("execution_id", executionId),
                        StructuredQuery.PropertyFilter.eq("operator_username", operatorName),
                        StructuredQuery.PropertyFilter.eq("status", "executado")))
                .build();
        QueryResults<Entity> results = datastore.run(query);

        JsonArray activities = new JsonArray();

        while (results.hasNext()) {
            Entity entity = results.next();
            JsonObject activity = new JsonObject();
            activity.addProperty("id", entity.getKey().getId());
            activity.addProperty("execution_id", entity.getString("execution_id"));
            activity.addProperty("operator_username", entity.getString("operator_username"));
            activity.addProperty("status", entity.getString("status"));
            activity.addProperty("start_time", entity.getString("start_time"));
            activity.addProperty("end_time", entity.getString("end_time"));
            if (entity.contains("observations")) {
                activity.addProperty("observations", entity.getString("observations"));
            }
            activities.add(activity);
        }
        if (activities.size() == 0) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"No concluded activities found for the specified execution and operator.\"}")
                    .build();
        }
        LOG.info("[GET-CONCLUDED-ACTIVITIES] Found " + activities.size() + " concluded activities for execution "
                + executionId + " and operator " + operatorName);

        return Response.ok(activities.toString()).build();
    }

    @GET
    @Path("/getOperation/{executionId}/{operationCode}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getOperationDetails(@PathParam("executionId") String executionId,
            @PathParam("operationCode") String operationCode,
            @CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader) {

        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");
        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        if (!Set.of(Roles.PRBO, Roles.PO).contains(role))
            return forbidden("Access denied");

        if (executionId == null || executionId.isEmpty() || operationCode == null || operationCode.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing executionId or operationCode\"}").build();
        }

        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(executionId);
        Entity execSheet = datastore.get(execKey);
        if (execSheet == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Execution sheet not found\"}").build();
        }

        if (!execSheet.contains("operations") || !execSheet.getString("operations").contains(operationCode)) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Operation code not found in execution sheet\"}").build();
        }

        JsonArray operationsArray = JsonParser.parseString(execSheet.getString("operations")).getAsJsonArray();
        JsonObject operation = null;
        for (JsonElement opElem : operationsArray) {
            JsonObject opObj = opElem.getAsJsonObject();
            if (opObj.has("operation_code") && opObj.get("operation_code").getAsString().equals(operationCode)) {
                operation = opObj;
                break;
            }
        }

        if (operation == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Operation code not found in execution sheet operations\"}").build();
        }

        JsonObject result = new JsonObject();
        result.addProperty("execution_id", executionId);
        result.addProperty("operation_code", operationCode);
        result.addProperty("expected_duration_hours",
                operation.has("expected_duration_hours") ? operation.get("expected_duration_hours").getAsString()
                        : null);
        result.addProperty("expected_finish_date",
                operation.has("expected_finish_date") ? operation.get("expected_finish_date").getAsString() : null);
        result.addProperty("observations",
                operation.has("observations") ? operation.get("observations").getAsString() : null);

        return Response.ok(result.toString()).build();
    }

    @GET
    @Path("/getAssignedActivities/{executionId}/{operatorUsername}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAssignedActivities(
            @PathParam("executionId") String executionId,
            @PathParam("operatorUsername") String operatorUsername,
            @CookieParam("session::apdc") Cookie cookie,
            @HeaderParam("Authorization") String authHeader) {

        LOG.info("[GET-ASSIGNED-ACTIVITIES] Fetching assigned operations and activities for " + operatorUsername);

        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return unauthorized("Invalid session");
        }

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) {
            return unauthorized("Failed to decode token");
        }

        String role = jwt.getClaim("role").asString();
        String requester = jwt.getSubject();

        if (!Set.of(Roles.PRBO, Roles.SDVBO).contains(role) && !operatorUsername.equals(requester)) {
            return forbidden("Access denied");
        }

        if (executionId == null || executionId.isEmpty() || operatorUsername == null || operatorUsername.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing executionId or operatorUsername\"}").build();
        }

        JsonArray resultArray = new JsonArray();

        Query<Entity> polyOpsQuery = Query.newEntityQueryBuilder()
                .setKind("Exec_Poly-Op")
                .setFilter(StructuredQuery.CompositeFilter.and(
                        StructuredQuery.PropertyFilter.eq("execution_id", executionId),
                        StructuredQuery.PropertyFilter.eq("operator_username", operatorUsername)
                ))
                .build();
        QueryResults<Entity> polyOps = datastore.run(polyOpsQuery);

        while (polyOps.hasNext()) {
            Entity e = polyOps.next();
            JsonObject pair = new JsonObject();
            pair.addProperty("polygon_id", e.getString("polygon_id"));
            pair.addProperty("operation_code", e.getString("operation_code"));
            pair.addProperty("status", e.getString("status"));

            if (e.contains("starting_date"))
                pair.addProperty("starting_date", e.getString("starting_date"));
            if (e.contains("finishing_date"))
                pair.addProperty("finishing_date", e.getString("finishing_date"));
            if (e.contains("last_activity_date"))
                pair.addProperty("last_activity_date", e.getString("last_activity_date"));
            if (e.contains("observations"))
                pair.addProperty("observations", e.getString("observations"));

            JsonArray activities = new JsonArray();
            Query<Entity> activityQuery = Query.newEntityQueryBuilder()
                    .setKind("ExecutionActivity")
                    .setFilter(StructuredQuery.CompositeFilter.and(
                            StructuredQuery.PropertyFilter.eq("execution_id", executionId),
                            StructuredQuery.PropertyFilter.eq("polygon_id", e.getString("polygon_id")),
                            StructuredQuery.PropertyFilter.eq("operation_code", e.getString("operation_code")),
                            StructuredQuery.PropertyFilter.eq("operator_username", operatorUsername)
                    ))
                    .build();

            QueryResults<Entity> activityResults = datastore.run(activityQuery);

            while (activityResults.hasNext()) {
                Entity activity = activityResults.next();
                JsonObject act = new JsonObject();
                act.addProperty("activity_id", activity.getKey().getName());
                act.addProperty("status", activity.getString("status"));
                if (activity.contains("start_time"))
                    act.addProperty("start_time", activity.getString("start_time"));
                if (activity.contains("end_time"))
                    act.addProperty("end_time", activity.getString("end_time"));
                if (activity.contains("observations"))
                    act.addProperty("observations", activity.getString("observations"));

                if (activity.contains("gpx_track")) {
                    try {
                        act.add("tracks", g.toJsonTree(
                                g.fromJson(activity.getString("gpx_track"), ExecutionSheetData.Track[].class)));
                    } catch (Exception ignore) {
                    }
                }

                activities.add(act);
            }

            pair.add("activities", activities);
            resultArray.add(pair);
        }

        LOG.info("[GET-ASSIGNED-ACTIVITIES] Found " + resultArray.size() + " assignments for operator " + operatorUsername);

        return Response.ok(g.toJson(resultArray)).build();
    }


}
