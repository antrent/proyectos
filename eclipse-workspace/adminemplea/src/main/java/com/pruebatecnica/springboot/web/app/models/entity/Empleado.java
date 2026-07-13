package com.pruebatecnica.springboot.web.app.models.entity;

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
//import javax.validation.constraints.Email;
//import javax.validation.constraints.Max;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;

//import org.h2.value.ValueString;
//import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;

@Entity
@Table(name = "templeados")
public class Empleado implements Serializable {

	//definicion de columnas 
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY) 
	private Integer Id;

	@Pattern(regexp = "[A-Z]*")
	@NotEmpty
	@Column(name = "seg_apellido", length = 20)
	private String segApellido;

	@Pattern(regexp = "[A-Z]*")
	@NotEmpty
	//@Max(value = 20 )
	@Column(name = "pri_apellido", length = 20)
	private String priApellido;

	@Pattern(regexp = "[A-Z]*")
	@NotEmpty
	@Column(name = "pri_nombre", length = 20)
	private String priNombre;
	
	@Pattern(regexp = "[A-Z]*")
	//@Max(value = 50 )
	@Column(name = "otr_nombre", length = 50)
	private String otrNombre;

	@NotEmpty
	@Column(name = "pais_emp", length = 50)
	private String paisEmp;

	@NotEmpty
	@Column(name = "tip_documento", length = 5)
	private String tipDocumento;

	
	@Pattern(regexp = "[A-Za-z0-9]*")
	@NotEmpty
	@Column(name = "num_documento")
	private String numDocumento;

	@NotNull
	@Column(name = "fech_nacimiento")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern = "yyyy-MM-dd")
	private Date fechNacimiento;

	
	@NotEmpty
	@Column(name = "genero", length = 2)
	private String genero;

	//@NotNull
	//@Email
	@Column(name = "email", length = 300, unique = true)
	private String email;

	//@NotEmpty
	@Column(length = 40, unique = true)
	private String usuario;

	@NotNull
	@Column(name = "fech_ingreso")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern = "yyyy-MM-dd")
	private Date fechIngreso;

	@NotEmpty
	@Column(name = "area", length = 50)
	private String area;

	//@NotNull
	@Column(name = "estado", length = 2)
	private String estado;

	//@NotNull
	@Column(name = "password", length = 65)
	private String password;

	//@NotNull
	@Column(name = "password_confirma", length = 65)
	private String passwordConfirma;

	//@NotNull
	@Column(name = "fech_registro")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern = "yyyy-MM-dd")
	private Date fechRegistro;

	@NotEmpty
	@Column(name = "rol", length = 30)
	private String rol;

	
	//definicion de metodos set y get
	public Integer getId() {
		return Id;
	}

	public void setId(Integer id) {
		Id = id;
	}

	public String getSegApellido() {
		return segApellido;
	}

	public void setSegApellido(String segApellido) {
		this.segApellido = segApellido;
	}

	public String getPriApellido() {
		return priApellido;
	}

	public void setPriApellido(String priApellido) {
		this.priApellido = priApellido;
	}

	public String getPriNombre() {
		return priNombre;
	}

	public void setPriNombre(String priNombre) {
		this.priNombre = priNombre;
	}

	public String getOtrNombre() {
		return otrNombre;
	}

	public void setOtrNombre(String otrNombre) {
		this.otrNombre = otrNombre;
	}

	public String getPaisEmp() {
		return paisEmp;
	}

	public void setPaisEmp(String paisEmp) {
		this.paisEmp = paisEmp;
	}

	public String getTipDocumento() {
		return tipDocumento;
	}

	public void setTipDocumento(String tipDocumento) {
		this.tipDocumento = tipDocumento;
	}

	public String getNumDocumento() {
		return numDocumento;
	}

	public void setNumDocumento(String numDocumento) {
		this.numDocumento = numDocumento;
	}

	public Date getFechNacimiento() {
		return fechNacimiento;
	}

	public void setFechNacimiento(Date fechNacimiento) {
		this.fechNacimiento = fechNacimiento;
	}

	public String getGenero() {
		return genero;
	}

	public void setGenero(String genero) {
		this.genero = genero;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getUsuario() {
		return usuario;
	}

	public void setUsuario(String usuario) {
		this.usuario = usuario;
	}

	public Date getFechIngreso() {
		return fechIngreso;
	}

	public void setFechIngreso(Date fechIngreso) {
		this.fechIngreso = fechIngreso;
	}

	public String getArea() {
		return area;
	}

	public void setArea(String area) {
		this.area = area;
	}

	public String getEstado() {
		return estado;
	}

	public void setEstado(String estado) {
		this.estado = estado;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public String getPasswordConfirma() {
		return passwordConfirma;
	}

	public void setPasswordConfirma(String passwordConfirma) {
		this.passwordConfirma = passwordConfirma;
	}

	public Date getFechRegistro() {
		return fechRegistro;
	}

	public void setFechRegistro(Date fechRegistro) {
		this.fechRegistro = fechRegistro;
	}

	public String getRol() {
		return rol;
	}

	public void setRol(String rol) {
		this.rol = rol;
	}

	public static long getSerialversionuid() {
		return serialVersionUID;
	}

	private static final long serialVersionUID = 1L;

}
