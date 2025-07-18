package pt.unl.fct.di.apdc.userapp.resources;

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
        if (token == null || !JWTToken.validateJWT(token))
            return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null)
            return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        String userId = jwt.getSubject();

        if (!Roles.PRBO.equalsIgnoreCase(role))
            return forbidden("Only PRBO can create execution sheets");

        if (data == null || data.worksheet_id == null || data.worksheet_id.isBlank())
            return Response.status(Response.Status.BAD_REQUEST)
                .entity("{\"error\":\"worksheet_id is required\"}").build();

        Key wsKey = datastore.newKeyFactory().setKind("WorkSheet").newKey(data.worksheet_id);
        Entity worksheet = datastore.get(wsKey);
        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(data.worksheet_id);
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
            if (!opObj.has("operation_code")) continue;
            String code = opObj.get("operation_code").getAsString();
            operationCodeToId.put(code, idCounter++);
        }

        List<ExecutionSheetData.PolygonOperations> polyOpsList = new ArrayList<>();
        for (JsonElement f : features) {
            JsonObject feature = f.getAsJsonObject();
            JsonObject props = feature.getAsJsonObject("properties");
            if (!props.has("polygon_id")) continue;

            int polygonId = props.get("polygon_id").getAsInt();
            List<ExecutionSheetData.PolygonOperation> polygonOps = new ArrayList<>();

            for (Map.Entry<String, Integer> entry : operationCodeToId.entrySet()) {
                ExecutionSheetData.PolygonOperation po = new ExecutionSheetData.PolygonOperation();
                po.operation_code = entry.getKey();
                po.operation_id = entry.getValue();
                po.status = "nao_iniciado";
                polygonOps.add(po);
            }

            ExecutionSheetData.PolygonOperations polyOps = new ExecutionSheetData.PolygonOperations();
            polyOps.polygon_id = polygonId;
            polyOps.operations = polygonOps;
            polyOpsList.add(polyOps);
        }

        String polyOpsJson = g.toJson(polyOpsList);
        

        Entity.Builder builder = Entity.newBuilder(execKey)
            .set("worksheet_id", data.worksheet_id)
            .set("created_by", userId)
            .set("created_at", System.currentTimeMillis())
            .set("starting_date", startingDate)
            .set("finishing_date", finishingDate)
            .set("observations", observations)
            .set("operations", operationsJson)
            .set("polygons_operations", StringValue.newBuilder(polyOpsJson).setExcludeFromIndexes(true).build());

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
        String userId = jwt.getSubject();

        if (!Roles.PRBO.equalsIgnoreCase(role))
            return forbidden("Only PRBO can assign operations");

        if (data == null || data.worksheet_id == null || data.polygons_operations == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Invalid execution sheet data\"}").build();

        Entity userEntity = datastore.get(datastore.newKeyFactory().setKind("User").newKey(userId));
        if (userEntity == null || !userEntity.contains("user_employer"))
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"PRBO does not have an associated employer.\"}").build();

        String employer = userEntity.getString("user_employer");

        // Verificar folha de obra
        Entity worksheet = datastore.get(datastore.newKeyFactory().setKind("WorkSheet").newKey(data.worksheet_id));
        if (worksheet == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Worksheet not found\"}").build();

        if (!employer.equals(worksheet.getString("service_provider_id")))
            return forbidden("You cannot assign operations for a worksheet outside your organization.");

        // Buscar folha de execução
        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(data.worksheet_id);
        Entity execSheet = datastore.get(execKey);
        if (execSheet == null)
            return Response.status(Response.Status.NOT_FOUND).entity("{\"error\":\"Execution sheet not found\"}").build();

        Type listType = new TypeToken<List<ExecutionSheetData.PolygonOperations>>() {}.getType();
        List<ExecutionSheetData.PolygonOperations> sheetData =
                g.fromJson(execSheet.getString("polygons_operations"), listType);

        int assignedCount = 0;
        List<String> debugOutput = new ArrayList<>();

        for (ExecutionSheetData.PolygonOperations poly : data.polygons_operations) {
            int polygonId = poly.polygon_id;

            for (ExecutionSheetData.PolygonOperation op : poly.operations) {
                if (op.operator_username == null || op.operator_username.isBlank()) {
                    debugOutput.add("⚠️ Missing operator_username for operation " + op.operation_code + " in polygon " + polygonId);
                    continue;
                }

                // Validar operador
                Key operatorKey = datastore.newKeyFactory().setKind("User").newKey(op.operator_username);
                Entity operator = datastore.get(operatorKey);
                if (operator == null) {
                    debugOutput.add("❌ Operator not found: " + op.operator_username);
                    continue;
                }
                if (!Roles.PO.equalsIgnoreCase(operator.getString("user_role"))) {
                    debugOutput.add("❌ User " + op.operator_username + " is not a PO.");
                    continue;
                }
                if (!operator.getString("user_employer").equals(employer)) {
                    debugOutput.add("❌ Operator " + op.operator_username + " not from your organization.");
                    continue;
                }

                boolean updated = false;

                for (ExecutionSheetData.PolygonOperations sheetPoly : sheetData) {
                    if (sheetPoly.polygon_id == polygonId) {
                        for (ExecutionSheetData.PolygonOperation sheetOp : sheetPoly.operations) {
                            if (sheetOp.operation_code != null &&
                                sheetOp.operation_code.equalsIgnoreCase(op.operation_code)) {

                                sheetOp.operator_username = op.operator_username;
                                sheetOp.status = "atribuido";
                                assignedCount++;
                                updated = true;
                                debugOutput.add("✅ Assigned " + op.operator_username + " to " + op.operation_code + " in polygon " + polygonId);
                                break;
                            }
                        }
                    }
                }

                if (!updated) {
                    debugOutput.add("⚠️ Operation " + op.operation_code + " in polygon " + polygonId + " not found.");
                }
            }
        }

        // Regravar a folha com dados atualizados
        Entity updatedExecSheet = Entity.newBuilder(execSheet.getKey())
                .set("worksheet_id", execSheet.getString("worksheet_id"))
                .set("created_by", execSheet.getString("created_by"))
                .set("created_at", execSheet.getLong("created_at"))
                .set("starting_date", execSheet.getString("starting_date"))
                .set("finishing_date", execSheet.getString("finishing_date"))
                .set("observations", execSheet.getString("observations"))
                .set("operations", execSheet.getString("operations"))
                .set("polygons_operations", StringValue.newBuilder(g.toJson(sheetData)).setExcludeFromIndexes(true).build())
                .build();
        datastore.put(updatedExecSheet);

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

        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(data.worksheet_id);
        Entity execSheet = datastore.get(execKey);
        if (execSheet == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Execution sheet not found\"}").build();

        Type listType = new TypeToken<List<ExecutionSheetData.PolygonOperations>>() {}.getType();
        List<ExecutionSheetData.PolygonOperations> sheetData =
                g.fromJson(execSheet.getString("polygons_operations"), listType);

        int startedCount = 0;
        List<String> debugOutput = new ArrayList<>();
        String now = LocalDateTime.now().toString();
        String today = LocalDate.now().toString();

        for (ExecutionSheetData.PolygonOperations inputPoly : data.polygons_operations) {
            for (ExecutionSheetData.PolygonOperation inputOp : inputPoly.operations) {
                boolean found = false;
                for (ExecutionSheetData.PolygonOperations sheetPoly : sheetData) {
                    if (sheetPoly.polygon_id == inputPoly.polygon_id) {
                        for (ExecutionSheetData.PolygonOperation sheetOp : sheetPoly.operations) {
                            if (sheetOp.operation_code.equals(inputOp.operation_code)) {
                                if (!user.equals(sheetOp.operator_username)) {
                                    debugOutput.add("⛔ " + inputOp.operation_code + " not assigned to you.");
                                    continue;
                                }

                                sheetOp.status = "em_execucao";
                                if (sheetOp.starting_date == null) sheetOp.starting_date = today;
                                sheetOp.last_activity_date = today;

                                ExecutionSheetData.Activity activity = new ExecutionSheetData.Activity();
                                activity.activity_id = UUID.randomUUID().toString();
                                activity.operator_username = user;
                                activity.start_time = now;
                                activity.observations = inputOp.observations;
                                activity.photo_urls = inputOp.photo_urls;
                                activity.gps_track = (inputOp.tracks != null && !inputOp.tracks.isEmpty())
                                        ? inputOp.tracks.get(0) : null;

                                if (sheetOp.activities == null)
                                    sheetOp.activities = new ArrayList<>();
                                sheetOp.activities.add(activity);

                                debugOutput.add("✅ Started activity " + inputOp.operation_code + " in polygon " + inputPoly.polygon_id);
                                startedCount++;
                                found = true;
                                break;
                            }
                        }
                    }
                }

                if (!found)
                    debugOutput.add("❌ Operation " + inputOp.operation_code + " not found for polygon " + inputPoly.polygon_id);
            }
        }

        // Guardar alterações na ExecutionSheet
        Entity updatedExecSheet = Entity.newBuilder(execSheet.getKey())
                .set("worksheet_id", execSheet.getString("worksheet_id"))
                .set("created_by", execSheet.getString("created_by"))
                .set("created_at", execSheet.getLong("created_at"))
                .set("starting_date", execSheet.getString("starting_date"))
                .set("finishing_date", execSheet.getString("finishing_date"))
                .set("observations", execSheet.getString("observations"))
                .set("operations", execSheet.getString("operations"))
                .set("polygons_operations", StringValue.newBuilder(g.toJson(sheetData)).setExcludeFromIndexes(true).build())
                .build();

        datastore.put(updatedExecSheet);

        JsonObject response = new JsonObject();
        response.addProperty("message", startedCount + " activity(ies) started.");
        response.add("debug", g.toJsonTree(debugOutput));
        return Response.ok(g.toJson(response)).build();
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
        String user = jwt.getSubject();

        if (!Roles.PO.equalsIgnoreCase(role)) return forbidden("Only PO can stop activities");

        if (data == null || data.worksheet_id == null || data.polygons_operations == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Invalid execution sheet data\"}").build();

        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(data.worksheet_id);
        Entity execSheet = datastore.get(execKey);
        if (execSheet == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Execution sheet not found\"}").build();

        Type listType = new TypeToken<List<ExecutionSheetData.PolygonOperations>>() {}.getType();
        List<ExecutionSheetData.PolygonOperations> sheetData =
                g.fromJson(execSheet.getString("polygons_operations"), listType);

        int stoppedCount = 0;
        List<String> debugOutput = new ArrayList<>();
        String now = LocalDateTime.now().toString();
        String today = LocalDate.now().toString();

        for (ExecutionSheetData.PolygonOperations inputPoly : data.polygons_operations) {
            for (ExecutionSheetData.PolygonOperation inputOp : inputPoly.operations) {
                boolean found = false;
                for (ExecutionSheetData.PolygonOperations sheetPoly : sheetData) {
                    if (sheetPoly.polygon_id == inputPoly.polygon_id) {
                        for (ExecutionSheetData.PolygonOperation sheetOp : sheetPoly.operations) {
                            if (sheetOp.operation_code.equals(inputOp.operation_code)) {
                                if (!user.equals(sheetOp.operator_username)) {
                                    debugOutput.add("⛔ Operation " + inputOp.operation_code + " not assigned to you.");
                                    continue;
                                }

                                if (sheetOp.activities == null || sheetOp.activities.isEmpty()) {
                                    debugOutput.add("❌ No activities to stop for " + inputOp.operation_code + ".");
                                    continue;
                                }

                                // Procurar a última atividade sem end_time
                                ExecutionSheetData.Activity lastActivity = null;
                                for (int i = sheetOp.activities.size() - 1; i >= 0; i--) {
                                    ExecutionSheetData.Activity act = sheetOp.activities.get(i);
                                    if (user.equals(act.operator_username) && act.end_time == null) {
                                        lastActivity = act;
                                        break;
                                    }
                                }

                                if (lastActivity == null) {
                                    debugOutput.add("❌ No open activity found for user " + user + " in operation " + inputOp.operation_code);
                                    continue;
                                }

                                lastActivity.end_time = now;
                                sheetOp.last_activity_date = today;
                                stoppedCount++;
                                found = true;
                                debugOutput.add("✅ Stopped activity for " + inputOp.operation_code + " in polygon " + inputPoly.polygon_id);
                                break;
                            }
                        }
                    }
                }

                if (!found)
                    debugOutput.add("❌ Operation " + inputOp.operation_code + " not found or not running.");
            }
        }

        // Guardar folha atualizada
        Entity updatedExecSheet = Entity.newBuilder(execSheet.getKey())
                .set("worksheet_id", execSheet.getString("worksheet_id"))
                .set("created_by", execSheet.getString("created_by"))
                .set("created_at", execSheet.getLong("created_at"))
                .set("starting_date", execSheet.getString("starting_date"))
                .set("finishing_date", execSheet.getString("finishing_date"))
                .set("observations", execSheet.getString("observations"))
                .set("operations", execSheet.getString("operations"))
                .set("polygons_operations", StringValue.newBuilder(g.toJson(sheetData)).setExcludeFromIndexes(true).build())
                .build();

        datastore.put(updatedExecSheet);

        JsonObject response = new JsonObject();
        response.addProperty("message", stoppedCount + " activity(ies) stopped.");
        response.add("debug", g.toJsonTree(debugOutput));
        return Response.ok(g.toJson(response)).build();
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

        String role = jwt.getClaim("role").asString();
        String user = jwt.getSubject();

        if (!Roles.PO.equalsIgnoreCase(role))
            return forbidden("Only PO can add info");

        if (data == null || data.worksheet_id == null || data.polygons_operations == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Invalid execution sheet data\"}").build();

        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(data.worksheet_id);
        Entity execSheet = datastore.get(execKey);
        if (execSheet == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Execution sheet not found\"}").build();

        Type listType = new TypeToken<List<ExecutionSheetData.PolygonOperations>>() {}.getType();
        List<ExecutionSheetData.PolygonOperations> sheetData =
                g.fromJson(execSheet.getString("polygons_operations"), listType);

        int updatedCount = 0;
        List<String> debug = new ArrayList<>();

        for (ExecutionSheetData.PolygonOperations inputPoly : data.polygons_operations) {
            for (ExecutionSheetData.PolygonOperation inputOp : inputPoly.operations) {
                for (ExecutionSheetData.PolygonOperations sheetPoly : sheetData) {
                    if (sheetPoly.polygon_id == inputPoly.polygon_id) {
                        for (ExecutionSheetData.PolygonOperation sheetOp : sheetPoly.operations) {
                            if (sheetOp.operation_code.equals(inputOp.operation_code)) {

                                // Garantir que atividade é do operador
                                if (!user.equals(sheetOp.operator_username)) {
                                    debug.add("⛔ Operation " + inputOp.operation_code + " not assigned to you.");
                                    continue;
                                }

                                if (sheetOp.activities == null || sheetOp.activities.isEmpty()) {
                                    debug.add("❌ No activities found for operation " + inputOp.operation_code);
                                    continue;
                                }

                                // Ir buscar a última atividade terminada
                                ExecutionSheetData.Activity last = null;
                                for (int i = sheetOp.activities.size() - 1; i >= 0; i--) {
                                    ExecutionSheetData.Activity act = sheetOp.activities.get(i);
                                    if (user.equals(act.operator_username) && act.end_time != null) {
                                        last = act;
                                        break;
                                    }
                                }

                                if (last == null) {
                                    debug.add("❌ No completed activity found for " + inputOp.operation_code);
                                    continue;
                                }

                                // Atualizar dados
                                if (inputOp.observations != null)
                                    last.observations = inputOp.observations;

                                if (inputOp.photo_urls != null)
                                    last.photo_urls = inputOp.photo_urls;

                                if (inputOp.tracks != null && !inputOp.tracks.isEmpty())
                                    last.gps_track = inputOp.tracks.get(0);

                                debug.add("✅ Added info to " + inputOp.operation_code + " in polygon " + inputPoly.polygon_id);
                                updatedCount++;
                            }
                        }
                    }
                }
            }
        }

        // Atualizar folha
        Entity updated = Entity.newBuilder(execSheet.getKey())
                .set("worksheet_id", execSheet.getString("worksheet_id"))
                .set("created_by", execSheet.getString("created_by"))
                .set("created_at", execSheet.getLong("created_at"))
                .set("starting_date", execSheet.getString("starting_date"))
                .set("finishing_date", execSheet.getString("finishing_date"))
                .set("observations", execSheet.getString("observations"))
                .set("operations", execSheet.getString("operations"))
                .set("polygons_operations", StringValue.newBuilder(g.toJson(sheetData)).setExcludeFromIndexes(true).build())
                .build();

        datastore.put(updated);

        JsonObject response = new JsonObject();
        response.addProperty("message", updatedCount + " activity(ies) updated.");
        response.add("debug", g.toJsonTree(debug));
        return Response.ok(g.toJson(response)).build();
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

    @POST
    @Path("/export")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    public Response exportExecutionSheet(@CookieParam("session::apdc") Cookie cookie,
                                        @HeaderParam("Authorization") String authHeader,
                                        JsonObject input) {

        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) return unauthorized("Failed to decode token");

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
        Type polyListType = new TypeToken<List<ExecutionSheetData.PolygonOperations>>() {}.getType();
        List<ExecutionSheetData.PolygonOperations> polygonOps =
                g.fromJson(execSheet.getString("polygons_operations"), polyListType);

        JsonArray polygonOpsArray = new JsonArray();
        for (ExecutionSheetData.PolygonOperations poly : polygonOps) {
            JsonObject polyJson = new JsonObject();
            polyJson.addProperty("polygon_id", poly.polygon_id);

            JsonArray opArray = new JsonArray();
            for (ExecutionSheetData.PolygonOperation op : poly.operations) {
                JsonObject opJson = new JsonObject();
                opJson.addProperty("operation_id", op.operation_id);
                opJson.addProperty("status", op.status != null ? op.status : "unassigned");
                if (op.starting_date != null) opJson.addProperty("starting_date", op.starting_date);
                if (op.finishing_date != null) opJson.addProperty("finishing_date", op.finishing_date);
                if (op.last_activity_date != null) opJson.addProperty("last_activity_date", op.last_activity_date);
                if (op.observations != null) opJson.addProperty("observations", op.observations);

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

	    Type listType = new TypeToken<List<ExecutionSheetData.PolygonOperations>>() {}.getType();
	    List<ExecutionSheetData.PolygonOperations> sheetData = 
	        g.fromJson(execSheet.getString("polygons_operations"), listType);
	    
	    ExecutionSheetData.PolygonOperation result = null;
	    for (ExecutionSheetData.PolygonOperations polyOps : sheetData) {
	    	for (ExecutionSheetData.PolygonOperation op : polyOps.operations) {
	        if (op.operation_code.equalsIgnoreCase(operationCode)) {
	        		result = op;
	                break;
	            }
	        }
	        if (result != null) break;
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
                                        ExecutionSheetData data) {
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) return unauthorized("Invalid session");

        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) return unauthorized("Failed to decode token");

        String role = jwt.getClaim("role").asString();
        String user = jwt.getSubject();

        if (!Roles.PRBO.equalsIgnoreCase(role) && !Roles.SDVBO.equalsIgnoreCase(role))
            return forbidden("Only PRBO or SDVBO can edit operations");

        if (data == null || data.worksheet_id == null || data.polygons_operations == null)
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Invalid execution sheet data\"}").build();

        Key execKey = datastore.newKeyFactory().setKind("ExecutionSheet").newKey(data.worksheet_id);
        Entity execSheet = datastore.get(execKey);
        if (execSheet == null)
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Execution sheet not found\"}").build();

        Type listType = new TypeToken<List<ExecutionSheetData.PolygonOperations>>() {}.getType();
        List<ExecutionSheetData.PolygonOperations> sheetData =
                g.fromJson(execSheet.getString("polygons_operations"), listType);

        int editedCount = 0;
        List<String> debug = new ArrayList<>();

        for (ExecutionSheetData.PolygonOperations inputPoly : data.polygons_operations) {
            for (ExecutionSheetData.PolygonOperation inputOp : inputPoly.operations) {
                for (ExecutionSheetData.PolygonOperations sheetPoly : sheetData) {
                    if (sheetPoly.polygon_id == inputPoly.polygon_id) {
                        for (ExecutionSheetData.PolygonOperation sheetOp : sheetPoly.operations) {
                            if (sheetOp.operation_code.equals(inputOp.operation_code)) {

                                if (inputOp.expected_duration_hours == null)
                                    sheetOp.expected_duration_hours = inputOp.expected_duration_hours;

                                if (inputOp.expected_finish_date != null)
                                    sheetOp.expected_finish_date = inputOp.expected_finish_date;

                                debug.add("✅ Edited operation " + inputOp.operation_code + " in polygon " + inputPoly.polygon_id);
                                editedCount++;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Atualizar folha no Datastore
        Entity updated = Entity.newBuilder(execSheet.getKey())
                .set("worksheet_id", execSheet.getString("worksheet_id"))
                .set("created_by", execSheet.getString("created_by"))
                .set("created_at", execSheet.getLong("created_at"))
                .set("starting_date", execSheet.getString("starting_date"))
                .set("finishing_date", execSheet.getString("finishing_date"))
                .set("observations", execSheet.getString("observations"))
                .set("operations", execSheet.getString("operations"))
                .set("polygons_operations", StringValue.newBuilder(g.toJson(sheetData)).setExcludeFromIndexes(true).build())
                .build();

        datastore.put(updated);

        JsonObject response = new JsonObject();
        response.addProperty("message", editedCount + " operation(s) updated.");
        response.add("debug", g.toJsonTree(debug));
        return Response.ok(g.toJson(response)).build();
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


