package pt.unl.fct.di.apdc.userapp.util;

public class FilterRequest {
    public TokenAuth token;
    public String status;
    public int limit = 10;
    public int offset = 0;

    public FilterRequest() {}

    public boolean isValid() {
        return token != null && token.username != null && token.role != null;
    }
}
