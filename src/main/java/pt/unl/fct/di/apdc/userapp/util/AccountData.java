package pt.unl.fct.di.apdc.userapp.util;

public class AccountData {

    public String username;
	public String password;
	public String confirmation;
	public String email;
	public String name;
	public String telephone;
	public String profile;

	public String identity_number;
    public String role;
    public String nif;
    public String employer;
    public String job;
    public String address;
    public String company_nif;
    public String account_state;
    public String photo_url;
	
	
	public AccountData() {
		
	}
	
	public AccountData(String username, String password, String confirmation, 
	String name, String email, String telephone, String profile) {
		this.username = username;
		this.password = password;
		this.confirmation = confirmation;
		this.name = name;
		this.email = email;
		this.telephone = telephone;
		this.profile = profile;
		
	}
	
	private boolean nonEmptyOrBlankField(String field) {
		return field != null && !field.isBlank();
	}
	
	public boolean validRegistration() {
		
		 	
		return nonEmptyOrBlankField(username) &&
			   nonEmptyOrBlankField(password) &&
			   nonEmptyOrBlankField(email) &&
			   nonEmptyOrBlankField(name) &&
			   nonEmptyOrBlankField(telephone) &&
			   email.contains("@") &&
			   password.equals(confirmation)&&
			   profile != null && (profile.equals("public") || profile.equals("private"));
	}
}
