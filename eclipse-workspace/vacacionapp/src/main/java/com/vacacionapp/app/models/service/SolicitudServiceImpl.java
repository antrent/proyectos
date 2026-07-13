package com.vacacionapp.app.models.service;

import java.util.Date;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vacacionapp.app.models.dao.ISolicitudDao;
import com.vacacionapp.app.models.entity.Empleado;
import com.vacacionapp.app.models.entity.Solicitud;

@Service
public class SolicitudServiceImpl implements ISolicitudService {

	@Autowired
	private ISolicitudDao solicitudDao;
	
	@Override
	@Transactional(readOnly=true)
	public List<Solicitud> findAll() {
		return solicitudDao.findAll();
	}

	@Override
	@Transactional(readOnly=true)
	public Page<Solicitud> findAll(Pageable pageable) {
		return solicitudDao.findAll(pageable);
	}

	@Override
	public Solicitud findById(Integer solicitudCod) {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public List<Solicitud> findByCodBySolByEmpJef(int codEmpJef) {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public Solicitud findByCodEmpByCodSol(int codEmpSol, int codSolEmp) {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public Empleado findJefeByCodEmp(int codEmp) {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public int findByCodEmpByEstado(int codEmpSol) {
		// TODO Auto-generated method stub
		return 0;
	}

	@Override
	public int findByCodEmpByFech(int codEmp, Date fechaInicio, Date fechaFin, Date fechSalida, Date fechReingreso) {
		// TODO Auto-generated method stub
		return 0;
	}

	@Override
	@Transactional(readOnly=true)
	public List<Solicitud> findByAllByFechSolicitud(String FechSolicitudIni, String FechSolicitudFin) {
		return solicitudDao.findByAllByFechSolicitud(FechSolicitudIni, FechSolicitudFin);
	}

}
