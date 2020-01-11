package com.vacacionapp.app.models.service;

import java.util.List;

import com.vacacionapp.app.models.entity.DetEmpleadoCargo;

public interface IDetEmpleadoCargoService {

	public List<DetEmpleadoCargo> findAll();
	
	public DetEmpleadoCargo findById(Integer detEmpCarCod);
	
	public List<DetEmpleadoCargo> findByEmpCodigo(int EmpCarCod);	
	
	public DetEmpleadoCargo findByEmpCodigoFechFin(int EmpCarCod);
	
	public void save(DetEmpleadoCargo detEmpleadoCargo);
	
	public void deleteById(int detEmpCarCod);
	
}
