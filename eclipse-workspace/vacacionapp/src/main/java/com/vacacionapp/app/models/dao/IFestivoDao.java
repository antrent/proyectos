package com.vacacionapp.app.models.dao;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.vacacionapp.app.models.entity.Festivo;

public interface IFestivoDao  extends JpaRepository<Festivo, Integer>  {

	@Query(value="select COUNT(0) as cantFestivo from TFestivo where to_CHAR(fecha,'DD/MM/YYYY') between TO_DATE(?1,'DD/MM/YYYY') and TO_DATE(?2,'DD/MM/YYYY')", nativeQuery = true)
	public int contFestivo(String fechSal, String fechFin);
}
