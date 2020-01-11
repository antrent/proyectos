package com.vacacionapp.app.models.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.vacacionapp.app.models.entity.Festivo;


public interface IFestivoService {

	public List<Festivo> findAll();
	
	public Page<Festivo> findAll(Pageable pageable);
	
	public Festivo findById(Integer fesCod);
	
	public void save(Festivo festivo);
	
	public void deleteById(int fesCod);
	
}
