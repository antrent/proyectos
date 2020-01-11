package com.vacacionapp.app.models.entity;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.validation.constraints.Email;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;

import org.springframework.format.annotation.DateTimeFormat;

@Entity
@Table(name="TEmpleado")
public class Empleado implements Serializable{

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)//GenerationType.
	//@GeneratedValue(strategy = GenerationType.IDENTITY)//GenerationType.AUTO
	private Integer codigo;
	
	@NotEmpty
	@Column(name = "tip_documento")
    private String 	tipDocumento;
    
	@NotEmpty
	@Column(name = "num_documento")
    private String 	numDocumento;
	
	@NotEmpty
	@Column(name = "pri_nombre")
    private String 	priNombre;
	
	@Column(name = "seg_nombre")
    private String 	segNombre;  
	
	@NotEmpty
	@Column(name = "pri_apellido")
    private String 	priApellido;
	
	@NotEmpty
	@Column(name = "seg_apellido")
    private String 	segApellido;
	
	@NotNull
	@Column(name = "fech_nacimiento")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	//@DateTimeFormat(pattern = "dd/MM/yyyy")
    private Date 	fechNacimiento;
    
	@NotEmpty
    private String 	genero;
	
    private String 	iniciales;

    @NotNull
    @Column(name = "fech_ingreso")
    @Temporal(TemporalType.DATE)
    @DateTimeFormat(pattern="yyyy-MM-dd")
    //@DateTimeFormat(pattern = "dd/MM/yyyy")
    private Date	fechIngreso;
    
    //@NotEmpty
    @Email
    private String 	email;

    private String foto;
    
    @Column(length=40, unique=true) 
    private String usuario;
    
    @Column(length=60)
    private String password;
    
    private String activo;

	//@OneToMany(fetch=FetchType.LAZY, cascade=CascadeType.ALL)
    //@JoinColumn(name="codigo_emp_solicita")
    //@OneToMany(mappedBy="empleado",fetch=FetchType.LAZY, cascade=CascadeType.ALL)
    @OneToMany(fetch=FetchType.LAZY, cascade=CascadeType.ALL)
    @JoinColumn(name="codigo_emp_solicita")
    private List<Solicitud> solicitudes;
    
    /*relacion de empleado rol
    @OneToMany(fetch=FetchType.LAZY, cascade=CascadeType.ALL)
    @JoinColumn(name="empleado_codigo")
    private List<EmpleadoRole> empleadoRoles;
    fin*/

    private String rol;

    @OneToMany(fetch=FetchType.LAZY, cascade=CascadeType.ALL)
    @JoinColumn(name="empleado_codigo")
    private List<DetEmpleadoCargo> detEmpleadoCargos;
    
    
    public String getRol() {
		return rol;
	}

	public void setRol(String rol) {
		this.rol = rol;
	}

	public Empleado() {
    	solicitudes = new ArrayList<Solicitud>();
    	detEmpleadoCargos = new ArrayList<DetEmpleadoCargo>();
	}
	public Empleado(String tipoDoc, String numeDoc, String priNombre, String segNombre, 
			        String priApellido, String segApellido,	Date fechNacimiento, String genero, 
			        String iniciales, Date fechIngreso, String email, String foto, 
			        String usuario, String password, String rol, String activo) {

		this.tipDocumento = tipoDoc;
		this.numDocumento = numeDoc;
		this.priNombre = priNombre;
		this.segNombre = segNombre;
		this.priApellido = priApellido;
		this.segApellido = segApellido;
		this.fechNacimiento = fechNacimiento;
		this.genero = genero;
		this.iniciales = iniciales;
		this.fechIngreso = fechIngreso;
		this.email = email;
		this.foto = foto;
		this.usuario = usuario;
		this.password = password;
		this.rol = rol;
		this.activo = activo;
		
	}	
	
/*
    public List<EmpleadoRole> getEmpleadoRoles() {
		return empleadoRoles;
	}

	public void setEmpleadoRoles(List<EmpleadoRole> empleadoRoles) {
		this.empleadoRoles = empleadoRoles;
	}*/

	public String getDocNombre() {
		return numDocumento+" - "+priNombre+" "+segNombre+" "+priApellido+" "+segApellido;
	}
	
	public String getActivo() {
		return activo;
	}

	public void setActivo(String activo) {
		this.activo = activo;
	}
	public String getPassword() {
		return password;
	}
	public void setPassword(String password) {
		this.password = password;
	}
	public String getUsuario() {
		return usuario;
	}
	public void setUsuario(String usuario) {
		this.usuario = usuario;
	}


	public Integer getCodigo() {
		return codigo;
	}

	public void setCodigo(Integer codigo) {
		this.codigo = codigo;
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

	public String getPriNombre() {
		return priNombre;
	}

	public void setPriNombre(String priNombre) {
		this.priNombre = priNombre;
	}

	public String getSegNombre() {
		return segNombre;
	}

	public void setSegNombre(String segNombre) {
		this.segNombre = segNombre;
	}

	public String getPriApellido() {
		return priApellido;
	}

	public void setPriApellido(String priApellido) {
		this.priApellido = priApellido;
	}

	public String getSegApellido() {
		return segApellido;
	}

	public void setSegApellido(String segApellido) {
		this.segApellido = segApellido;
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

	public String getIniciales() {
		return iniciales;
	}

	public void setIniciales(String iniciales) {
		this.iniciales = iniciales;
	}

	public Date getFechIngreso() {
		return fechIngreso;
	}

	public void setFechIngreso(Date fechIngreso) {
		this.fechIngreso = fechIngreso;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getFoto() {
		return foto;
	}

	public void setFoto(String foto) {
		this.foto = foto;
	}
	
	public List<Solicitud> getSolicitudes() {
		return solicitudes;
	}

	public void setSolicitudes(List<Solicitud> solicitudes) {
		this.solicitudes = solicitudes;
	}
	
	public void addSolicitud(Solicitud solicitud) {
		solicitudes.add(solicitud);
	}


	public List<DetEmpleadoCargo> getDetEmpleadoCargos() {
		return detEmpleadoCargos;
	}

	public void setDetEmpleadoCargos(List<DetEmpleadoCargo> detEmpleadoCargo) {
		detEmpleadoCargos = detEmpleadoCargo;
	}	
	
	public void addDetEmpleadoCargo(DetEmpleadoCargo detEmpleadoCargo) {
		detEmpleadoCargos.add(detEmpleadoCargo);
	}	


	private static final long serialVersionUID = 1L;    
	    
}
