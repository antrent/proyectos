package com.vacacionapp.app.models.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.vacacionapp.app.models.entity.Departamento;

public interface IDepartamentoService {
	
	public List<Departamento> findAll();
	
	public Page<Departamento> findAll(Pageable pageable);
	
	public Departamento findById(Integer deptoCod);
	
	public void save(Departamento departamento);
	
	public void deleteById(int deptoCod);

}
