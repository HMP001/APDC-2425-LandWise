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
    public String telephone2;
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

    /**
     * Validação comum e obrigatória para qualquer tipo de conta.
     */
    private boolean basicFieldsValid() {
        return isNotBlank(username) &&
               isNotBlank(password) &&
               isNotBlank(confirmation) &&
               password.equals(confirmation) &&
               isNotBlank(email) &&
               email.contains("@") &&
               isNotBlank(role);
    }

    /**
     * Verifica os atributos obrigatórios no registo inicial por tipo de role.
     */
    public boolean validForRegistrationByRole() {
        if (!basicFieldsValid() || !Roles.isValidRole(role)) return false;
    
        switch (role.toUpperCase()) {
    
            case Roles.SYSADMIN:
            case Roles.SYSBO:
            case Roles.SMBO:
            case Roles.SGVBO:
            case Roles.SDVBO:
            case Roles.PRBO:
                return isNotBlank(name) &&
                       isNotBlank(nationality) &&
                       isNotBlank(residence_country) &&
                       isNotBlank(address) &&
                       isNotBlank(postal_code) &&
                       isNotBlank(telephone) &&
                       isNotBlank(telephone2) &&
                       isNotBlank(nif) &&
                       isNotBlank(cc) &&
                       isNotBlank(cc_issue_date) &&
                       isNotBlank(cc_issue_place) &&
                       isNotBlank(cc_validity) &&
                       isNotBlank(birth_date);
    
            case Roles.PO:
                return isNotBlank(name) &&
                       isNotBlank(telephone) &&
                       isNotBlank(employer);
    
            case Roles.ADLU:
                return isNotBlank(name) &&
                       isNotBlank(email) &&
                       isNotBlank(telephone) &&
                       isNotBlank(address) &&
                       isNotBlank(postal_code) &&
                       isNotBlank(nif) &&
                       isNotBlank(cc) &&
                       isNotBlank(cc_issue_date) &&
                       isNotBlank(cc_issue_place) &&
                       isNotBlank(cc_validity) &&
                       isNotBlank(birth_date) &&
                       isNotBlank(nationality) &&
                       isNotBlank(residence_country);
    
            case Roles.RU:
                return isNotBlank(name) &&
                       isNotBlank(nationality) &&
                       isNotBlank(residence_country) &&
                       isNotBlank(address) &&
                       isNotBlank(postal_code) &&
                       isNotBlank(telephone) &&
                       profile != null &&
                       (profile.equalsIgnoreCase("PUBLICO") || profile.equalsIgnoreCase("PRIVADO"));
    
            default:
                return false;
        }
    }
    

    /**
     * Verifica se um campo é não nulo e não vazio.
     */
    private boolean isNotBlank(String field) {
        return field != null && !field.isBlank();
    }
}
