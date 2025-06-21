package pt.unl.fct.di.apdc.userapp.filters;

import java.io.IOException;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class ReactRouterFilter implements Filter {
  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
          throws IOException, ServletException {
      
      HttpServletRequest req = (HttpServletRequest) request;
      HttpServletResponse res = (HttpServletResponse) response;
      String path = req.getRequestURI();

      // If the request is for API or static resources, continue normally
      if (path.startsWith("/rest/") || path.startsWith("/static/") || path.contains(".")) {
          chain.doFilter(request, response);
      } else {
          // Otherwise forward to index.html for React Router to handle the path
          System.out.println(">> React Router Redirect: " + path);
          RequestDispatcher dispatcher = request.getRequestDispatcher("/index.html");
          dispatcher.forward(request, response);
      }
  }
}
