package com.pruebatecnica.springboot.web.app.models.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.pruebatecnica.springboot.web.app.models.entity.Empleado;

public interface IEmpleadoService {

	public List<Empleado> findAll();
	
	public Page<Empleado> findAll(Pageable pageable);

	public Empleado findById(Integer empleadoId);
	
	public int findByNumDocByTipDoc(String numDoc , String tipDoc);

	public void save(Empleado empleado);

	public void deleteById(Integer empleadoCod);
}
