package com.vacacionapp.app.models.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.vacacionapp.app.models.entity.Cargo;

public interface ICargoService {
	
	public List<Cargo> findAll();
	
	public Page<Cargo> findAll(Pageable pageable);
	
	public Cargo findById(Integer carCod);
	
	public void save(Cargo cargo);
	
	public void deleteById(int cargoCod);
	
	public Cargo findByEmpCod(int EmpCod);

}
