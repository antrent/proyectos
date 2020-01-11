package com.vacacionapp.app.models.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vacacionapp.app.models.dao.IFestivoDao;
import com.vacacionapp.app.models.entity.Festivo;

@Service
public class FestivoServiceImpl implements IFestivoService {

	@Autowired
	private IFestivoDao festivoDao;
	
	@Override
	@Transactional(readOnly=true)
	public List<Festivo> findAll() {
		return (List<Festivo>) festivoDao.findAll();
	}

	@Override
	@Transactional(readOnly=true)
	public Festivo findById(Integer fesCod) {
		// TODO Auto-generated method stub
		return festivoDao.findById(fesCod).orElse(null);
	}

	@Override
	@Transactional	
	public void save(Festivo festivo) {
		festivoDao.save(festivo);

	}

	@Override
	@Transactional	
	public void deleteById(int fesCod) {
		festivoDao.deleteById(fesCod);

	}

	@Override
	@Transactional(readOnly = true)
	public Page<Festivo> findAll(Pageable pageable) {
			return festivoDao.findAll(pageable);
		
	}
	

}
