package com.vacacionapp.app.models.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vacacionapp.app.models.dao.IDepartamentoDao;
import com.vacacionapp.app.models.entity.Departamento;

@Service
public class DepartamentoServiceImpl implements IDepartamentoService {

	@Autowired
	private IDepartamentoDao departamentoDao;
	
	@Override
	@Transactional(readOnly=true)
	public List<Departamento> findAll() {
		return (List<Departamento>) departamentoDao.findAll();
	}

	@Override
	@Transactional(readOnly=true)
	public Page<Departamento> findAll(Pageable pageable) {
		return departamentoDao.findAll(pageable);
	}	
	
	@Override
	@Transactional(readOnly=true)
	public Departamento findById(Integer deptoCod) {
		return departamentoDao.findById(deptoCod).orElse(null);
	}

	@Override
	@Transactional
	public void save(Departamento departamento) {
		departamentoDao.save(departamento);	
	}

	@Override
	@Transactional
	public void deleteById(int deptoCod) {
		departamentoDao.deleteById(deptoCod);
		
	}

}
