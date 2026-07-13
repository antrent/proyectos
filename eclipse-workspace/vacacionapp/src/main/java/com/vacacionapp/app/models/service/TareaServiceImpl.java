package com.vacacionapp.app.models.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vacacionapp.app.models.dao.ITareaDao;
import com.vacacionapp.app.models.entity.Tarea;

@Service
public class TareaServiceImpl implements ITareaService {

	@Autowired
	private ITareaDao tareaDao;
	
	@Override
	@Transactional(readOnly=true)
	public List<Tarea> findAll() {
		// TODO Auto-generated method stub
		return tareaDao.findAll();
	}

	@Override
	@Transactional(readOnly=true)
	public Tarea findById(Integer codTarea) {
		// TODO Auto-generated method stub
		return tareaDao.findById(codTarea).orElse(null);
	}

	@Override
	@Transactional
	public void save(Tarea tarea) {
		// TODO Auto-generated method stub
		tareaDao.save(tarea);
	}

	@Override
	@Transactional
	public void deleteById(Integer codTarea) {
		// TODO Auto-generated method stub
		tareaDao.deleteById(codTarea);
	}
	
	@Override
	@Transactional(readOnly = true)
	public Page<Tarea> findAll(Pageable pageable) {
			return tareaDao.findAll(pageable);
		
	}	

}
