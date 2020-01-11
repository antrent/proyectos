package com.vacacionapp.app.models.dao;


import java.util.Date;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
//import org.springframework.data.repository.PagingAndSortingRepository;

import com.vacacionapp.app.models.entity.Empleado;

public interface IEmpleadoDao extends JpaRepository/*PagingAndSortingRepository*/<Empleado, Integer> {

	@Query(value="select count(0) from TSOLICITUD s where s.CODIGO_EMP_SOLICITA = ?1 and EXTRACT(YEAR FROM s.FECH_FIN) = ?2", nativeQuery = true)
	public int contSolByEmplAndAnio(int codEmpl, int anio);
	
	@Query(value="select max(s.FECH_FIN) FECH_FIN from TSOLICITUD s where s.CODIGO_EMP_SOLICITA = ?1", nativeQuery = true)
	public Date maxFechFinSolByEmpl(int codEmpl);
	
	@Query(value="select max(s.FECH_INI) FECH_INI from TSOLICITUD s where s.CODIGO_EMP_SOLICITA = ?1", nativeQuery = true)
	public Date maxFechIniSolByEmpl(int codEmpl);
	
	public Empleado findByUsuario(String usuario);
	
	@Query(value="select e.CODIGO,e.ACTIVO,e.EMAIL,e.FECH_INGRESO,e.FECH_NACIMIENTO,e.FOTO,e.GENERO,e.INICIALES,e.NUM_DOCUMENTO,e.PASSWORD,e.PRI_APELLIDO,e.PRI_NOMBRE,e.ROL,e.SEG_APELLIDO,e.SEG_NOMBRE,e.TIP_DOCUMENTO,e.USUARIO\r\n " + 
			"from \r\n " + 
			"(select j.*\r\n " + 
			"from tdetempleadocargo d, \r\n " + 
			"     tcargo c, \r\n " + 
			"     templeado e,\r\n " + 
			"     (select c.DEPTO_CODIGO, d.cargo_codigo, c.descripcion, e.*\r\n " + 
			"        from tdetempleadocargo d, tcargo c, templeado e\r\n " + 
			"       where d.cargo_codigo = c.codigo\r\n " + 
			"         and d.EMP_CODIGO = e.codigo\r\n " + 
			"         and c.es_jefe = 'S'\r\n " + 
			"         and c.activo = 'S'\r\n " + 
			"         and d.fech_fin is null) j\r\n " + 
			"where d.cargo_codigo = c.codigo\r\n " + 
			"and d.EMP_CODIGO = e.codigo\r\n " + 
			"and d.EMP_CODIGO = ?1\r\n " + 
			"and d.fech_fin is null\r\n " + 
			"and c.DEPTO_CODIGO = j.DEPTO_CODIGO) e ", nativeQuery = true)
	public Empleado findJefeByCodEmp(int codEmp);
	

	@Query(value="select e.NUM_DOCUMENTO||' - '||e.PRI_NOMBRE||' '||e.SEG_NOMBRE||' '||e.PRI_APELLIDO||' '||e.SEG_APELLIDO\r\n" + 
			     " from templeado e\r\n" + 
			     " where e.codigo = ?1", nativeQuery = true)	
	public String findNomEmpByCodEmp(int codEmp);
	
	@Query(value="select codigo from templeado where num_documento = ?1 and tip_documento = ?2", nativeQuery = true)	
	public int findByNumDocByTipDoc(String numDoc, String tipDoc);	
	
}
