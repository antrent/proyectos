package com.vacacionapp.app.util.lisval;

public enum TipoEstadoSolicitudEnum {

	A("Aprobada"),
	R("Rechazada"),
	E("Estudio");

private String descripcion;   
private TipoEstadoSolicitudEnum(String d) {
	descripcion = d;
} 

public String getTipoEstadoSolicitud() {
       return descripcion;
   }
}
