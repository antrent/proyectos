package com.pruebatecnica.springboot.web.app.util.lisval;

public enum TipoAreaEnum {

		ADMIN("Administración"),
		FINAN("Financiera"),
		COMPR("Compras"),
		INFRA("Infraestructura"),
		OPERA("Operación"),
		THUMO("Talento Humano"),
		SERGE("Servicios Varios");
	
	private String descripcion;   
	private TipoAreaEnum(String d) {
		descripcion = d;
	} 
	
	public String getTipoArea() {
	       return descripcion;
	   }
	
}
