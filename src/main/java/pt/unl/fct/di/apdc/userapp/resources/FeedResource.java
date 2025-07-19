package pt.unl.fct.di.apdc.userapp.resources;

import java.lang.reflect.Type;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Logger;

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
import pt.unl.fct.di.apdc.userapp.util.CommentRequest;
import pt.unl.fct.di.apdc.userapp.util.CreateEventRequest;
import pt.unl.fct.di.apdc.userapp.util.CreatePostRequest;
import pt.unl.fct.di.apdc.userapp.util.EventReviewRequest;
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

@Path("/feed")
@Produces(MediaType.APPLICATION_JSON + ";charset=utf-8")
public class FeedResource {
	    
	private static final Logger LOG = Logger.getLogger(MediaResource.class.getName());
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
    
    @POST
    @Path("/post")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response createPost(@CookieParam("session::apdc") Cookie cookie,
                             @HeaderParam("Authorization") String authHeader,
                             CreatePostRequest request) {
    	
    	String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return unauthorized("Invalid session");
        }
        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) {
            return unauthorized("Failed to decode token");
        }
        String userId = jwt.getSubject();
        
        if (request == null || request.description == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Post content is required\"}").build();
        }
        
        String postId = UUID.randomUUID().toString();
        Key postKey = datastore.newKeyFactory().setKind("FeedPost").newKey(postId);
        Entity post = Entity.newBuilder(postKey)
        		.set("id", postId)
                .set("author_id", userId)
                .set("description", request.description)
                .set("imageURL", request.imageURL)
                .set("created_at", System.currentTimeMillis())
                .set("comments", "[]")
                .set("likes", 0)
                .set("liked_by", "[]")
                .build();
        datastore.put(post);
        
        return Response.ok("{\"message\":\"Post created successfully\", \"post_id\":\"" + postId + "\"}").build();
    }
    
    @POST
    @Path("/post/{postId}/comment")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response addComment(@PathParam("postId") String postId,
                             @CookieParam("session::apdc") Cookie cookie,
                             @HeaderParam("Authorization") String authHeader,
                             CommentRequest input) {
    	String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return unauthorized("Invalid session");
        }
        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) {
            return unauthorized("Failed to decode token");
        }
        String userId = jwt.getSubject();
    	
    	if (input == null || input.text == null || input.text.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Comment text is required\"}").build();
        }
    	
    	Key postKey = datastore.newKeyFactory().setKind("FeedPost").newKey(postId);
        Entity post = datastore.get(postKey);
        if (post == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Post not found\"}").build();
        }
        
        JsonArray commentsArray;
        if (post.contains("comments")) {
            commentsArray = JsonParser.parseString(post.getString("comments")).getAsJsonArray();
        } else {
            commentsArray = new JsonArray();
        }
        
        String commentId = UUID.randomUUID().toString();
        JsonObject newComment = new JsonObject();
        newComment.addProperty("id", commentId);
        newComment.addProperty("author_id", userId);
        newComment.addProperty("text", input.text);
        newComment.addProperty("created_at", System.currentTimeMillis());
        commentsArray.add(newComment);
        
        Entity updatedPost = Entity.newBuilder(post)
                .set("comments", commentsArray.toString())
                .build();
        
        datastore.put(updatedPost);
        
        return Response.ok("{\"message\":\"Comment added successfully\", \"comment_id\":\"" + 
                newComment.get("id").getAsString() + "\"}")
      .build();
    }
    
    @POST
    @Path("/post/{postId}/like")
    @Produces(MediaType.APPLICATION_JSON)
    public Response likePost(@PathParam("postId") String postId,
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
        String userId = jwt.getSubject();
        
        Key postKey = datastore.newKeyFactory().setKind("FeedPost").newKey(postId);
        Entity post = datastore.get(postKey);
        if (post == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Post not found\"}").build();
        }
        
        long currentLikes = post.getLong("likes");
        JsonArray likedBy = post.contains("liked_by") ? 
                JsonParser.parseString(post.getString("liked_by")).getAsJsonArray() : 
                new JsonArray();
        
        boolean alreadyLiked = false;
        int userIndex = -1;
        for (int i = 0; i < likedBy.size(); i++) {
            if (likedBy.get(i).getAsString().equals(userId)) {
                alreadyLiked = true;
                userIndex = i;
                break;
            }
        }
        if (alreadyLiked) {
            // Remove like
            likedBy.remove(userIndex);
            currentLikes--;
        } else {
            // Add like
            likedBy.add(userId);
            currentLikes++;
        }
        
        Entity updatedPost = Entity.newBuilder(post)
                .set("likes", currentLikes)
                .set("liked_by", likedBy.toString())
                .build();
        datastore.put(updatedPost);
        
        String message = alreadyLiked ? "Like removed" : "Like added";
        return Response.ok("{\"message\":\"" + message + "\", \"likes\":" + currentLikes + "}").build();
    }
    
    @GET
    @Path("/posts")
    @Produces(MediaType.APPLICATION_JSON)
    public Response listPostsByLikes(@CookieParam("session::apdc") Cookie cookie,
                                   @HeaderParam("Authorization") String authHeader) {
        
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return unauthorized("Invalid session");
        }
        
        Query<Entity> query = Query.newEntityQueryBuilder()
                .setKind("FeedPost")
                .setOrderBy(StructuredQuery.OrderBy.desc("likes"))
                .build();
        
        QueryResults<Entity> results = datastore.run(query);
        
        JsonArray postsArray = new JsonArray();
        while (results.hasNext()) {
            Entity post = results.next();
            JsonObject postJson = new JsonObject();
            postJson.addProperty("id", post.getString("id"));
            postJson.addProperty("author_id", post.getString("author_id"));
            postJson.addProperty("description", post.getString("description"));
            postJson.addProperty("imageURL", post.getString("imageURL"));
            postJson.addProperty("created_at", post.getLong("created_at"));
            postJson.addProperty("likes", post.getLong("likes"));
            postJson.add("comments", JsonParser.parseString(post.getString("comments")));
            postJson.add("liked_by", JsonParser.parseString(post.getString("liked_by")));
            
            postsArray.add(postJson);
        }
        
        return Response.ok(g.toJson(postsArray)).build();
    }
    
    @POST
    @Path("/event")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response createEvent(@CookieParam("session::apdc") Cookie cookie,
                              @HeaderParam("Authorization") String authHeader,
                              CreateEventRequest input) {
    	String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return unauthorized("Invalid session");
        }
        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) {
            return unauthorized("Failed to decode token");
        }
        String userId = jwt.getSubject();
    	
        if (input == null || input.name == null || input.date == null || input.location == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Event name, date and location are required\"}").build();
        }
        
        String eventId = UUID.randomUUID().toString();
        Key eventKey = datastore.newKeyFactory().setKind("Event").newKey(eventId);
        Entity event = Entity.newBuilder(eventKey)
        		.set("id", eventId)
                .set("name", input.name)
                .set("date", input.date)
                .set("location", input.location)
                .set("description", input.description != null ? input.description : "")
                .set("organizer_id", userId)
                .set("attendees", "[]")
                .set("reviews", "[]")
                .build();
        datastore.put(event);

        return Response.ok("{\"message\":\"Event created successfully\", \"event_id\":\"" + eventId + "\"}")
                .build();
    }
    
    @GET
    @Path("/events")
    @Produces(MediaType.APPLICATION_JSON)
    public Response listEventsByDate(@CookieParam("session::apdc") Cookie cookie,
                                   @HeaderParam("Authorization") String authHeader) {
        
        try {
            String token = extractJWT(cookie, authHeader);
            if (token == null || !JWTToken.validateJWT(token)) {
                return unauthorized("Invalid session");
            }
            
            DecodedJWT jwt = JWTToken.extractJWT(token);
            if (jwt == null) {
                return unauthorized("Failed to decode token");
            }
            
            Query<Entity> query = Query.newEntityQueryBuilder()
                    .setKind("Event")
                    .setOrderBy(StructuredQuery.OrderBy.asc("date"))
                    .build();
            
            QueryResults<Entity> results = datastore.run(query);
            
            JsonArray eventsArray = new JsonArray();
            while (results.hasNext()) {
                Entity event = results.next();
                JsonObject eventJson = new JsonObject();
                
                // Safely handle all fields with null checks
                eventJson.addProperty("id", event.contains("id") ? event.getString("id") : "");
                eventJson.addProperty("name", event.contains("name") ? event.getString("name") : "");
                eventJson.addProperty("date", event.contains("date") ? event.getString("date") : "");
                eventJson.addProperty("location", event.contains("location") ? event.getString("location") : "");
                eventJson.addProperty("description", event.contains("description") ? event.getString("description") : "");
                eventJson.addProperty("organizer_id", event.contains("organizer_id") ? event.getString("organizer_id") : "");
                
                eventJson.add("reviews", event.contains("reviews") ? 
                    JsonParser.parseString(event.getString("reviews")) : new JsonArray());
                
                if (event.contains("average_rating")) {
                    eventJson.addProperty("average_rating", event.getDouble("average_rating"));
                }
                
                eventsArray.add(eventJson);
            }
            
            return Response.ok(g.toJson(eventsArray)).build();
            
        } catch (Exception e) {
            LOG.severe("Error listing events: " + e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"error\":\"Failed to retrieve events\"}")
                    .build();
        }
    }
    
    @POST
    @Path("/event/{eventId}/review")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response addEventReview(@PathParam("eventId") long eventId,
                                 @CookieParam("session::apdc") Cookie cookie,
                                 @HeaderParam("Authorization") String authHeader,
                                 EventReviewRequest input) {
       
        String token = extractJWT(cookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return unauthorized("Invalid session");
        }
        DecodedJWT jwt = JWTToken.extractJWT(token);
        if (jwt == null) {
            return unauthorized("Failed to decode token");
        }
        String userId = jwt.getSubject();
        
        if (input == null || input.rating == null || input.rating < 1 || input.rating > 5) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Rating must be between 1 and 5\"}").build();
        }
        
        Key eventKey = datastore.newKeyFactory().setKind("Event").newKey(eventId);
        Entity event = datastore.get(eventKey);
        if (event == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"Event not found\"}").build();
        }
        
        JsonArray reviewsArray;
        if (event.contains("reviews")) {
            reviewsArray = JsonParser.parseString(event.getString("reviews")).getAsJsonArray();
        } else {
            reviewsArray = new JsonArray();
        }
        
        String reviewId = UUID.randomUUID().toString();
        JsonObject newReview = new JsonObject();
        newReview.addProperty("id", reviewId);
        newReview.addProperty("author_id", userId);
        newReview.addProperty("rating", input.rating);
        newReview.addProperty("comment", input.comment != null ? input.comment : "");
        newReview.addProperty("created_at", System.currentTimeMillis());
        
        reviewsArray.add(newReview);
        
        double newAverageRating = calculateAverageRating(reviewsArray);
        
        Entity updatedEvent = Entity.newBuilder(event)
                .set("reviews", reviewsArray.toString())
                .set("average_rating", newAverageRating)
                .build();
        
        datastore.put(updatedEvent);
        
        JsonObject response = new JsonObject();
        response.addProperty("author_id", userId);
        response.addProperty("message", "Review added successfully");
        response.addProperty("review_id", reviewId);
        response.addProperty("average_rating", newAverageRating);
        
        return Response.ok(g.toJson(response)).build();
    }

    private double calculateAverageRating(JsonArray reviews) {
        if (reviews.size() == 0) return 0.0;
        
        double sum = 0;
        for (JsonElement element : reviews) {
            JsonObject review = element.getAsJsonObject();
            sum += review.get("rating").getAsInt();
        }
        
        return Math.round((sum / reviews.size()) * 10.0) / 10.0;
    }

    
}
