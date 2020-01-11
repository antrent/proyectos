package com.vacacionapp.app.models.dao;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.vacacionapp.app.models.entity.CargoTarea;

public interface ICargoTareaDao extends JpaRepository<CargoTarea, Integer> {

	@Query(value="select * from TCARGOTAREA p where p.CARGO_CODIGO = ?1", nativeQuery = true)
	public List<CargoTarea> findByCodigoCargo(int codCargo);
}
