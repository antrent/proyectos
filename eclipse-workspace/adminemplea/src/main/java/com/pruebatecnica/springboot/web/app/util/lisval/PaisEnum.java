package com.pruebatecnica.springboot.web.app.util.lisval;

public enum PaisEnum {
	CO("Colombia"),
	EU("Estados Unidos");

private String descripcion;   
private PaisEnum(String d) {
	descripcion = d;
} 

public String getPais() {
       return descripcion;
   }
}
