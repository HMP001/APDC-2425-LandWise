package pt.unl.fct.di.apdc.userapp.resources;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.google.gson.JsonObject;

import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Cookie;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.NewCookie;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;
import pt.unl.fct.di.apdc.userapp.util.JWTToken;

@Path("/logout")
@Produces(MediaType.APPLICATION_JSON)
public class LogoutResource {

    private String extractJWT(Cookie cookie, String authHeader) {
        if (cookie != null && cookie.getValue() != null)
            return cookie.getValue();
    
        if (authHeader != null && authHeader.startsWith("Bearer "))
            return authHeader.substring("Bearer ".length());
    
        return null;
    }

  @POST
  public Response logout(@CookieParam("session::apdc") Cookie jwtCookie,
                         @HeaderParam("Authorization") String authHeader) {

        String token = extractJWT(jwtCookie, authHeader);
        if (token == null || !JWTToken.validateJWT(token)) {
            return Response.status(Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Invalid or expired session.\"}")
                    .build();
        }

      DecodedJWT decoded = JWTToken.extractJWT(token);

      if (decoded == null || !JWTToken.validateJWT(token)) {
          return Response.status(Response.Status.UNAUTHORIZED)
              .entity("{\"message\":\"Token JWT inválido ou expirado.\"}").build();
      }

      String username = decoded.getClaim("username").asString();

      NewCookie expiredCookie = new NewCookie.Builder("session::apdc")
              .path("/")
              .comment("JWT logout")
              .maxAge(0)
              .secure(false)
              .httpOnly(true) 
              .build();

      JsonObject response = new JsonObject();
      response.addProperty("message", "Logout efetuado com sucesso.");
      response.addProperty("user", username);

      return Response.ok(response.toString()).cookie(expiredCookie).build();
  }

}
