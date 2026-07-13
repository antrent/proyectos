package com.vacacionapp.app.models.entity;

import java.io.Serializable;
import java.util.Date;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;

import org.springframework.format.annotation.DateTimeFormat;

@Entity
@Table(name="ttarea")
public class Tarea implements Serializable {

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)//GenerationType.
	private int codigo; 
	
	@Column(name="descripcion")
	private String descripcion;

	@Column(name="fech_creacion")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	//@DateTimeFormat(pattern = "dd/MM/yyyy")
	private Date fechCreacion;	
	
	public int getCodigo() {
		return codigo;
	}

	public void setCodigo(int codigo) {
		this.codigo = codigo;
	}

	public String getDescripcion() {
		return descripcion;
	}

	public void setDescripcion(String descripcion) {
		this.descripcion = descripcion;
	}

	public Date getFechCreacion() {
		return fechCreacion;
	}

	public void setFechCreacion(Date fechCreacion) {
		this.fechCreacion = fechCreacion;
	}

	private static final long serialVersionUID = 1L;	
}
