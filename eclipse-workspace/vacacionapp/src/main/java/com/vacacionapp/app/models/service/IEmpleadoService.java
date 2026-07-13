package com.vacacionapp.app.models.service;

import java.util.Date;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.vacacionapp.app.models.entity.Empleado;
import com.vacacionapp.app.models.entity.Solicitud;

public interface IEmpleadoService {

	public List<Empleado> findAll();
	
	public Page<Empleado> findAll(Pageable pageable);

	public Empleado findById(Integer empleadoCod);
	
	public int findByNumDocByTipDoc(String numDoc , String tipDoc);

	public void save(Empleado empleado);

	public void deleteById(int empleadoCod);
	
	public void saveSolicitud(Solicitud solicitud);
	
	public int contSolByEmplAndAnio(int codEmpl, int anio);
	
	public Date maxFechFinSolByEmpl(int codEmpl);
	
	public Date maxFechIniSolByEmpl(int codEmpl);
	
	public int contFestivo(String fechSal, String fechFin);
	
	public List<Solicitud> findByCodBySolByEmpJef(int codEmpJef, String estSol);
	
	
	public Solicitud findByCodEmpByCodSol(int codEmpSol , int codSolEmp);
	
	public Empleado findJefeByCodEmp(int codEmp);
	
	public String findNomEmpByCodEmp(int codEmp);
	
}
