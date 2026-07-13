package com.pruebatecnica.springboot.web.app.util.lisval;

public enum RolEnum {
	USEREMP("Empleado"),
	ADMIN("Administrador");

private String descripcion;   
private RolEnum(String d) {
	descripcion = d;
} 

public String getRol() {
       return descripcion;
   }
}
