package pt.unl.fct.di.apdc.userapp.util;

public class RegisterData {
	
	public String username;
	public String password;
	public String confirmation;
	public String email;
	public String name;
	
	
	public RegisterData() {
		
	}
	
	public RegisterData(String username, String password, String confirmation, String email, String name) {
		this.username = username;
		this.password = password;
		this.confirmation = confirmation;
		this.email = email;
		this.name = name;
	}
	
	private boolean nonEmptyOrBlankField(String field) {
		return field != null && !field.isBlank();
	}
	
	public boolean validRegistration() {
		
		 	
		return nonEmptyOrBlankField(username) &&
			   nonEmptyOrBlankField(password) &&
			   nonEmptyOrBlankField(email) &&
			   nonEmptyOrBlankField(name) &&
			   email.contains("@") &&
			   password.equals(confirmation);
	}
}
