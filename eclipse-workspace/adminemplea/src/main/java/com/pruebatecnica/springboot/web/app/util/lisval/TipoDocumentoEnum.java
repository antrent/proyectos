package com.pruebatecnica.springboot.web.app.util.lisval;

public enum TipoDocumentoEnum {

		CC("Cedula de Ciudadania"),
		CE("Cedula Extrangeria"),
		PA("Pasaporte"),
		PE("Permiso Especial");
	private String descripcion;   
	private TipoDocumentoEnum(String d) {
		descripcion = d;
	} 
	
	public String getTipoDocumento() {
	       return descripcion;
	   }
}
