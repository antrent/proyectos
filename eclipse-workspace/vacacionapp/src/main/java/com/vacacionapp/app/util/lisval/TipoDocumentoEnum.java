package com.vacacionapp.app.util.lisval;

public enum TipoDocumentoEnum {

		CC("Cedula de Ciudadania"),
		TI("Targeta de Identidad"),
		CE("Cedula Extrangeria");
	
	private String descripcion;   
	private TipoDocumentoEnum(String d) {
		descripcion = d;
	} 
	
	public String getTipoDocumento() {
	       return descripcion;
	   }
}
