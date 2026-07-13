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
import javax.validation.constraints.NotEmpty;

import org.springframework.format.annotation.DateTimeFormat;

@Entity
@Table(name="TCargo")
public class Cargo implements Serializable{

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Integer codigo;
	
	@NotEmpty
	@Column(name = "descripcion")
    private String 	descripcion;

	@Column(name = "activo")	
	private String activo;
	
	
	@Column(name = "es_jefe")	
	private String esJefe;

	
	@Column(name = "depto_codigo")	
	private int deptoCodigo;	
	
	@Column(name = "fecha_creacion")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	//@DateTimeFormat(pattern = "dd/MM/yyyy")	
	private Date fechaCreacion;

	private Departamento departamento;
	
	
	public Departamento getDepartamento() {
		return departamento;
	}

	public void setDepartamento(Departamento departamento) {
		this.departamento = departamento;
	}

	public String getActivo() {
		return activo;
	}

	public void setActivo(String activo) {
		this.activo = activo;
	}

	public Date getFechaCreacion() {
		return fechaCreacion;
	}

	public void setFechaCreacion(Date fechaCreacion) {
		this.fechaCreacion = fechaCreacion;
	}

	public Integer getCodigo() {
		return codigo;
	}

	public void setCodigo(Integer codigo) {
		this.codigo = codigo;
	}

	public String getDescripcion() {
		return descripcion;
	}

	public void setDescripcion(String descripcion) {
		this.descripcion = descripcion;
	}

	public String getEsJefe() {
		return esJefe;
	}

	public void setEsJefe(String esJefe) {
		this.esJefe = esJefe;
	}

	public int getDeptoCodigo() {
		return deptoCodigo;
	}

	public void setDeptoCodigo(int deptoCodigo) {
		this.deptoCodigo = deptoCodigo;
	}
	
	
}
