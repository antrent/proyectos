package com.vacacionapp.app.util.lisval;

public enum TipoArchivoEnum {
	EM("Empleado"),
	SO("Solicitud"),
	FE("Festivo");
private String descripcion;   
private TipoArchivoEnum(String d) {
	descripcion = d;
} 

public String getTipoArchivo() {
       return descripcion;
   }
}
