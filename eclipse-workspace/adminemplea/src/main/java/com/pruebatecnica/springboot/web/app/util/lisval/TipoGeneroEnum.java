package com.pruebatecnica.springboot.web.app.util.lisval;

public enum TipoGeneroEnum {

		M("Masculino"),
		F("Femenino");
	
	private String descripcion;   
	private TipoGeneroEnum(String d) {
		descripcion = d;
	} 
	
	public String getTipoGenero() {
	       return descripcion;
	   }
	
}
