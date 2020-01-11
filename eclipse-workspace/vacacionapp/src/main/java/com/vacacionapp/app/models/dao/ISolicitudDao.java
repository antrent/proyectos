package com.vacacionapp.app.models.dao;

import java.util.Date;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.vacacionapp.app.models.entity.Solicitud;

public interface ISolicitudDao extends JpaRepository<Solicitud, Integer> {

	@Query(value="select s.* "+ 
				 "from tsolicitud s\r\n " +
				 "where s.est_sol_codigo = ?2 \r\n " +
				 //"where s.est_sol_codigo = 'E'\r\n " +
				 "/*and s.CODIGO_EMP_SOLICITA <> ?1*/ "  +
				 "  and S.CODIGO_EMP_SOLICITA in (select D.EMP_CODIGO\r\n" + 
				 "                                  from tdetempleadocargo d\r\n" + 
				 "                                 where D.CARGO_CODIGO in (select c.codigo\r\n" + 
				 "                                                            from tcargo c\r\n" + 
				 "                                                            where C.DEPTO_CODIGO in (select D.CODIGO\r\n" + 
				 "                                                                                       from tdepartamento d, tcargo c\r\n" + 
				 "                                                                                      where D.CODIGO = C.DEPTO_CODIGO\r\n" + 
				 "                                                                                        and C.CODIGO = (select D.CARGO_CODIGO\r\n" + 
				 "                                                                                                          from tdetempleadocargo d\r\n" + 
				 "                                                                                                         where D.FECH_FIN is null\r\n" + 
				 "                                                                                                           and D.EMP_CODIGO = ?1)\r\n" + 
				 "                                                                                        and C.ES_JEFE = 'S')))", nativeQuery = true)
	public List<Solicitud> findByCodBySolByEmpJef(int codEmpJef,String estSol);
	
	@Query(value="select s.* from tsolicitud s where s.CODIGO_EMP_SOLICITA = ?1 and s.CODIGO = ?2", nativeQuery = true)
	public Solicitud findByCodEmpByCodSol(int codEmpSol , int codSolEmp);
	
	@Query(value="select count(0) cantSolEstudio from tsolicitud s where s.CODIGO_EMP_SOLICITA = ?1 and s.EST_SOL_CODIGO = 'E'", nativeQuery = true)
	public int findByCodEmpByEstado(int codEmpSol);

	@Query(value="select count(0) \r\n" + 
				 "from tsolicitud s \r\n" + 
				 "where s.CODIGO_EMP_SOLICITA = ?1 \r\n" + 
				 "and s.EST_SOL_CODIGO = 'A'\r\n" + 
				 "and s.FECH_INI = ?2\r\n" + 
				 "and s.FECH_FIN = ?3\r\n" + 
				 "and ((?4 between s.FECH_SALIDA and s.fech_reingreso) or (?5 between s.FECH_SALIDA and s.fech_reingreso))", nativeQuery = true)
	public int findByCodEmpByFech(int codEmp, Date fechaInicio, Date fechaFin, Date fechSalida, Date fechReingreso  );	
	
	@Query(value="select s.* \r\n" + 
				 "   from tsolicitud s \r\n" + 
				 "  where (s.FECH_SOLICITUD between nvl(to_date(?1,'dd/mm/yyyy'),S.FECH_SOLICITUD) and nvl(to_date(?2,'dd/mm/yyyy'),S.FECH_SOLICITUD))\r\n" + 
				 "    and s.est_sol_codigo = 'A'", nativeQuery = true)
	public List<Solicitud> findByAllByFechSolicitud(String FechSolicitudIni, String FechSolicitudFin);	

}
