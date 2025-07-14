package pt.unl.fct.di.apdc.userapp.util;

public class BlockAccountRequest {
    public String targetUsername;

    public BlockAccountRequest() {}

    public boolean valid() {
        return targetUsername != null && !targetUsername.trim().isEmpty();
    }
}