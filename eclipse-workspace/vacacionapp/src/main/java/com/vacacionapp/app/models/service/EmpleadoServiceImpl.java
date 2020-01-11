package com.vacacionapp.app.models.service;

import java.util.Date;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vacacionapp.app.models.dao.IEmpleadoDao;
import com.vacacionapp.app.models.dao.IFestivoDao;
import com.vacacionapp.app.models.dao.ISolicitudDao;
import com.vacacionapp.app.models.entity.Empleado;
import com.vacacionapp.app.models.entity.Solicitud;

@Service
public class EmpleadoServiceImpl implements IEmpleadoService {

	@Autowired
	private IEmpleadoDao empleadoDao;
	
	@Autowired
	private ISolicitudDao solicitudDao;

	@Autowired
	private IFestivoDao festivoDao;
	
	
	@Override
	@Transactional(readOnly=true)
	public List<Empleado> findAll() {
		return (List<Empleado>) empleadoDao.findAll();
	}

	@Override
	@Transactional(readOnly=true)
	public Empleado findById(Integer empleadoCod) {
		return empleadoDao.findById(empleadoCod).orElse(null);
		
	}

	@Override
	@Transactional	
	public void save(Empleado empleado) {
		empleadoDao.save(empleado);
	}

	@Override
	@Transactional	
	public void deleteById(int empleadoCod) {
		empleadoDao.deleteById(empleadoCod);
		
	}

	@Override
	@Transactional(readOnly = true)
	public Page<Empleado> findAll(Pageable pageable) {
		return empleadoDao.findAll(pageable);
	}

	@Override
	@Transactional
	public void saveSolicitud(Solicitud solicitud) {
		solicitudDao.save(solicitud);
	}

	@Override
	@Transactional(readOnly=true)
	public int contSolByEmplAndAnio(int codEmpl, int anio) {
		// TODO Auto-generated method stub
		return empleadoDao.contSolByEmplAndAnio(codEmpl, anio);
	}

	@Override
	@Transactional(readOnly=true)
	public Date maxFechFinSolByEmpl(int codEmpl) {
		return empleadoDao.maxFechFinSolByEmpl(codEmpl);
	}
	
	@Override
	@Transactional(readOnly=true)
	public Date maxFechIniSolByEmpl(int codEmpl) {
		return empleadoDao.maxFechIniSolByEmpl(codEmpl);
	}

	@Override
	@Transactional(readOnly=true)
	public int contFestivo(String fechSal, String fechFin) {
		return festivoDao.contFestivo(fechSal, fechFin);
	}
	
	@Override
	@Transactional(readOnly=true)
	public List<Solicitud> findByCodBySolByEmpJef(int codEmpJef, String estSol) {
		return solicitudDao.findByCodBySolByEmpJef(codEmpJef, estSol);
	}	
	
	@Override
	@Transactional(readOnly=true)
	public Solicitud findByCodEmpByCodSol(int codEmpSol , int codSolEmp) {
		return solicitudDao.findByCodEmpByCodSol(codEmpSol ,codSolEmp);
	}

	@Override
	@Transactional(readOnly=true)
	public Empleado findJefeByCodEmp(int codEmp) {
		
		//return solicitudDao.findJefeByCodEmp(codEmp);
		return empleadoDao.findJefeByCodEmp(codEmp);
		
	}	
	
	@Override
	@Transactional(readOnly=true)
	public String findNomEmpByCodEmp(int codEmp) {
		return empleadoDao.findNomEmpByCodEmp(codEmp);
	}

	@Override
	@Transactional(readOnly=true)
	public int findByNumDocByTipDoc(String numDoc, String tipDoc) {
		// TODO Auto-generated method stub
		return empleadoDao.findByNumDocByTipDoc(numDoc, tipDoc);
	}
	

}
