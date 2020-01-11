package com.pruebatecnica.springboot.web.app.models.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.pruebatecnica.springboot.web.app.models.dao.IEmpleadoDao;
import com.pruebatecnica.springboot.web.app.models.entity.Empleado;

@Service
public class EmpleadoServiceImpl implements IEmpleadoService {

	@Autowired
	private IEmpleadoDao empleadoDao;
	
	@Override
	@Transactional(readOnly=true)
	public List<Empleado> findAll() {
		return (List<Empleado>) empleadoDao.findAll();
	}

	@Transactional(readOnly=true)
	public Empleado findById(Integer empleadoId) {
		return empleadoDao.findOne(empleadoId);
	}

	@Override
	@Transactional	
	public void save(Empleado empleado) {
		empleadoDao.save(empleado);
	}

	@Override
	@Transactional	
	public void deleteById(Integer empleadoCod) {
		empleadoDao.deleteById(empleadoCod);
		
	}

	@Override
	@Transactional(readOnly = true)
	public Page<Empleado> findAll(Pageable pageable) {
		return empleadoDao.findAll(pageable);
	}

	@Override
	public int findByNumDocByTipDoc(String numDoc, String tipDoc) {
		// TODO Auto-generated method stub
		return 0;
	}
	

}
