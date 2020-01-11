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
import javax.validation.constraints.NotNull;

import org.springframework.format.annotation.DateTimeFormat;

@Entity
@Table(name="TFestivo")
public class Festivo implements Serializable {

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Integer codigo;
	
	@NotNull
	@Column(name = "fecha")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	private Date fecha;
	
	public Integer getCodigo() {
		return codigo;
	}

	public void setCodigo(Integer codigo) {
		this.codigo = codigo;
	}

	public Date getFecha() {
		return fecha;
	}


	public void setFecha(Date fecha) {
		this.fecha = fecha;
	}

	public Festivo() {}	
	
	public Festivo(Date fechFestivo) {
 		 this.fecha = fechFestivo;
	}		
	

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	
}
