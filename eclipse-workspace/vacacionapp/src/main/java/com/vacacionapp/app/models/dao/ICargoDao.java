package com.vacacionapp.app.models.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.vacacionapp.app.models.entity.Cargo;

public interface ICargoDao extends JpaRepository<Cargo, Integer> {

	
	@Query(value="select c.* from TDETEMPLEADOCARGO p, templeado e, tcargo c\r\n" + 
			 	 "where P.Emp_Codigo = E.Codigo\r\n" + 
			 	 "and p.cargo_codigo = c.codigo\r\n" + 
			 	 "and p.EMP_CODIGO = ?1\r\n" + 
			 	 "and P.Fech_Fin is null", nativeQuery = true)
	public Cargo findByEmpCod(int EmpCod);
}
