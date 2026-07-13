package com.pruebatecnica.springboot.web.app.auth.handler;

import java.util.Collection;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.SpringSecurityCoreVersion;
import org.springframework.security.core.userdetails.User;

public class MiUser extends User {

	private static final long serialVersionUID = SpringSecurityCoreVersion.SERIAL_VERSION_UID;
	
	//private static final Log logger = LogFactory.getLog(MiUser.class);	
	
	private String codigo;
	
	public String getCodigo() {
		return codigo;
	}

	public void setCodigo(String codigo) {
		this.codigo = codigo;
	}

	public MiUser(String codigo,String username, String password, Collection<? extends GrantedAuthority> authorities) {
		super(username, password, authorities);
		this.codigo =  codigo;
		
	}

	 public String toString() {
	        return this.codigo;
	    }
}
