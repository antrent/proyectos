package com.vacacionapp.app.models.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vacacionapp.app.models.dao.ICargoDao;
import com.vacacionapp.app.models.entity.Cargo;

@Service
public class CargoServiceImpl implements ICargoService {

	@Autowired
	private ICargoDao cargoDao;
	
	@Override
	@Transactional(readOnly=true)
	public List<Cargo> findAll() {
		return (List<Cargo>) cargoDao.findAll();
	}
	
	@Override
	@Transactional(readOnly=true)
	public Page<Cargo> findAll(Pageable pageable) {
		return cargoDao.findAll(pageable);
	}	
	

	@Override
	@Transactional(readOnly=true)
	public Cargo findById(Integer carCod) {
		return cargoDao.findById(carCod).orElse(null);
	}

	@Override
	@Transactional
	public void save(Cargo cargo) {
		cargoDao.save(cargo);
	}

	@Override
	@Transactional
	public void deleteById(int cargoCod) {
		cargoDao.deleteById(cargoCod);
	}

	@Override
	@Transactional(readOnly=true)
	public Cargo findByEmpCod(int EmpCod) {
		return cargoDao.findByEmpCod(EmpCod);
	}



}
