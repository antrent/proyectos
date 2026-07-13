package com.vacacionapp.app.models.dao;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.vacacionapp.app.models.entity.DetEmpleadoCargo;


public interface IDetEmpleadoCargoDao extends JpaRepository<DetEmpleadoCargo, Integer> {

	@Query(value="select * from TDETEMPLEADOCARGO p where p.EMP_CODIGO = ?1", nativeQuery = true)
	public List<DetEmpleadoCargo> findByEmpCodigo(int EmpCarCod);
	
	@Query(value="select * from TDETEMPLEADOCARGO p where p.EMP_CODIGO = ?1 and p.FECH_FIN IS NULL", nativeQuery = true)
	public DetEmpleadoCargo findByEmpCodigoFechFin(int EmpCarCod);
}
