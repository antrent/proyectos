package com.vacacionapp.app.models.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vacacionapp.app.models.dao.ICargoTareaDao;
import com.vacacionapp.app.models.entity.CargoTarea;

@Service
public class CargoTareaServiceImpl implements ICargoTareaService {

	@Autowired
	ICargoTareaDao cargoTareaDao;
	
	@Override
	@Transactional(readOnly=true)
	public List<CargoTarea> findAll() {
		// TODO Auto-generated method stub
		return cargoTareaDao.findAll();
	}

	@Override
	@Transactional(readOnly=true)
	public CargoTarea findById(Integer carTarCod) {
		// TODO Auto-generated method stub
		return cargoTareaDao.findById(carTarCod).orElse(null);
	}

	@Override
	@Transactional
	public void save(CargoTarea cargoTarea) {
		// TODO Auto-generated method stub
		cargoTareaDao.save(cargoTarea);
	}

	@Override
	@Transactional
	public void deleteById(Integer carTarCod) {
		// TODO Auto-generated method stub
		cargoTareaDao.deleteById(carTarCod);
	}

	@Override
	@Transactional(readOnly=true)
	public List<CargoTarea> findByCodigoCargo(int codCargo) {
		// TODO Auto-generated method stub
		return cargoTareaDao.findByCodigoCargo(codCargo);
	}

}
