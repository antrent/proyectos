package com.vacacionapp.app.util.lisval;

public enum PaisEnum {
	CO("Colombia"),
	ES("España");

private String descripcion;   
private PaisEnum(String d) {
	descripcion = d;
} 

public String getTipoDocumento() {
       return descripcion;
   }
}
