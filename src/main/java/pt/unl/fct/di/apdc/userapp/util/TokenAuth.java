package pt.unl.fct.di.apdc.userapp.util;

import java.util.UUID;

public class TokenAuth {

	public static final long EXPIRATION_TIME = 1000*60*60*2; //2 hours
	
	public String username;
	public String role;
	public long validateFrom;
	public long validateTo;
	public String magicnumber;
	
	public TokenAuth() {

	}
	
	public TokenAuth(String username, String role) {
		this.username = username;
		this.role = role;
		this.validateFrom = System.currentTimeMillis();
		this.validateTo = this.validateFrom + EXPIRATION_TIME;
		this.magicnumber = UUID.randomUUID().toString(); 
	}

}
