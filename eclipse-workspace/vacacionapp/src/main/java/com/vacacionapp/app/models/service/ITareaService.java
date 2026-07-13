package com.vacacionapp.app.models.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.vacacionapp.app.models.entity.Tarea;

public interface ITareaService {
	public List<Tarea> findAll();
	public Tarea findById(Integer codTarea);
	public void save(Tarea tarea);
	public void deleteById(Integer codTarea);
	public Page<Tarea> findAll(Pageable pageable);
}
