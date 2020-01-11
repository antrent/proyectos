package com.vacacionapp.app.models.entity;

import java.io.Serializable;
import java.util.Date;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.validation.constraints.NotEmpty;

import org.springframework.format.annotation.DateTimeFormat;

@Entity
@Table(name="TDetempleadocargo")
public class DetEmpleadoCargo implements Serializable {

	
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private int codigo;
	
	@NotEmpty
	@Column(name = "cargo_codigo")
    private String 	cargoCodigo;

	@Column(name = "emp_codigo")	
	private int empCodigo;
	
	@Column(name = "fech_ingreso")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd") 
	//@DateTimeFormat(pattern = "dd/MM/yyyy")	
	private Date fechIngreso;

	@Column(name = "fech_fin")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	//@DateTimeFormat(pattern = "dd/MM/yyyy")	
	private Date fechFin;	
	
	@Column(name = "fech_registro")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	//@DateTimeFormat(pattern = "dd/MM/yyyy")	
	private Date fechRegistro;

	
	@ManyToOne(fetch=FetchType.LAZY)
	private Empleado empleado;	
	
	
	public Empleado getEmpleado() {
		return empleado;
	}

	public void setEmpleado(Empleado empleado) {
		this.empleado = empleado;
		empCodigo = empleado.getCodigo();
	}

	public Integer getCodigo() {
		return codigo;
	}

	public void setCodigo(Integer codigo) {
		this.codigo = codigo;
	}

	public String getCargoCodigo() {
		return cargoCodigo;
	}

	public void setCargoCodigo(String cargoCodigo) {
		this.cargoCodigo = cargoCodigo;
	}

	public int getEmpCodigo() {
		return empCodigo;
	}

	public void setEmpCodigo(int empCodigo) {
		this.empCodigo = empCodigo;
	}

	public Date getFechIngreso() {
		return fechIngreso;
	}

	public void setFechIngreso(Date fechIngreso) {
		this.fechIngreso = fechIngreso;
	}

	public Date getFechFin() {
		return fechFin;
	}

	public void setFechFin(Date fechFin) {
		this.fechFin = fechFin;
	}

	public Date getFechRegistro() {
		return fechRegistro;
	}

	public void setFechRegistro(Date fechRegistro) {
		this.fechRegistro = fechRegistro;
	}
	
	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;	
	
}
