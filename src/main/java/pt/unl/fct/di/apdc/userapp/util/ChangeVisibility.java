package pt.unl.fct.di.apdc.userapp.util;

public class ChangeVisibility {
    public String newVisibility; // e.g., "PUBLIC" or "PRIVATE"
    public String targetUsername; // Optional, if visibility is for a specific user

    public ChangeVisibility() {}

    public ChangeVisibility(String newVisibility) {
        this.newVisibility = newVisibility;
    }

    public boolean valid() {
        return newVisibility != null &&
               (newVisibility.equalsIgnoreCase("PUBLIC") || newVisibility.equalsIgnoreCase("PRIVATE"));
    }
}

