package com.vacacionapp.app.models.entity;

import java.io.Serializable;

import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.Table;


@Entity
@Table(name="TCargotarea")
public class CargoTarea implements Serializable{

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private int codigo;
	
	
	@ManyToOne(fetch=FetchType.LAZY)
	private Tarea tarea;
	
	@ManyToOne(fetch=FetchType.LAZY) 
	private Cargo cargo;
	 
	
	/*
	@NotEmpty
	@Column(name = "cargo_codigo")
    private String 	cargoCodigo;
	
	@NotEmpty
	@Column(name = "tarea_codigo")
    private String 	tareaCodigo;*/
	
	
	public int getCodigo() {
		return codigo;
	}


	public void setCodigo(int codigo) {
		this.codigo = codigo;
	}


	public Tarea getTarea() {
		return tarea;
	}


	public void setTarea(Tarea tarea) {
		this.tarea = tarea;
	}


	public Cargo getCargo() {
		return cargo;
	}


	public void setCargo(Cargo cargo) {
		this.cargo = cargo;
	}


	private static final long serialVersionUID = 1L;

}
