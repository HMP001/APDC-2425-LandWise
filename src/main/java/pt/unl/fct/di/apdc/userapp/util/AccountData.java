package pt.unl.fct.di.apdc.userapp.util;

public class AccountData {

    public String username;
    public String password;
    public String confirmation;
    public String email;
    public String name;
    public String telephone;
    public String profile;

    public String role;
    public String nif;
    public String employer;
    public String job;
    public String address;
    public String postal_code;
    public String company_nif;
    public String photo_url;

    public String cc;
    public String cc_issue_date;
    public String cc_issue_place;
    public String cc_validity;
    public String birth_date;
    public String nationality;
    public String residence_country;

    public AccountData() {}

    public boolean validRegistration() {
        return isNotBlank(username) &&
               isNotBlank(password) &&
               isNotBlank(confirmation) &&
               isNotBlank(email) &&
               isNotBlank(name) &&
               isNotBlank(telephone) &&
               password.equals(confirmation) &&
               email.contains("@") &&
               profile != null && (profile.equalsIgnoreCase("PUBLICO") || profile.equalsIgnoreCase("PRIVADO")) &&
               isNotBlank(role);
    }

    private boolean isNotBlank(String field) {
        return field != null && !field.isBlank();
    }
}
