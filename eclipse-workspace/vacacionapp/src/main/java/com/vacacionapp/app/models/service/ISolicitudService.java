package com.vacacionapp.app.models.service;

import java.util.Date;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.vacacionapp.app.models.entity.Empleado;
import com.vacacionapp.app.models.entity.Solicitud;

public interface ISolicitudService {

	
	public List<Solicitud> findAll();
	
	public Page<Solicitud> findAll(Pageable pageable);

	public Solicitud findById(Integer solicitudCod);
	
	public List<Solicitud> findByCodBySolByEmpJef(int codEmpJef);
	
	public Solicitud findByCodEmpByCodSol(int codEmpSol , int codSolEmp);
	
	public Empleado findJefeByCodEmp(int codEmp);
	
	public int findByCodEmpByEstado(int codEmpSol);
	
	public int findByCodEmpByFech(int codEmp, Date fechaInicio, Date fechaFin, Date fechSalida, Date fechReingreso);
	
	public List<Solicitud> findByAllByFechSolicitud(String FechSolicitudIni, String FechSolicitudFin);
}
