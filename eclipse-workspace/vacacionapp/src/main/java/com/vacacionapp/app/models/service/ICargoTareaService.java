package com.vacacionapp.app.models.service;

import java.util.List;

import com.vacacionapp.app.models.entity.CargoTarea;

public interface ICargoTareaService {
	public List<CargoTarea> findAll();
	public CargoTarea findById(Integer carTarCod);
	public void save(CargoTarea cargoTarea);
	public void deleteById(Integer carTarCod);
	public List<CargoTarea> findByCodigoCargo(int codCargo);
}
