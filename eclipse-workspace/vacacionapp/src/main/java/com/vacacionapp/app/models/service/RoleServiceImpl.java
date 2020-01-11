package com.vacacionapp.app.models.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vacacionapp.app.models.dao.IRoleDao;
import com.vacacionapp.app.models.entity.Role;

@Service
public class RoleServiceImpl implements IRoleService {

	@Autowired
	private IRoleDao roleDao;
	
	@Override
	public List<Role> findAll() {
		return roleDao.findAll();
	}


	@Override
	@Transactional
	public void save(Role role) {
		roleDao.save(role);

	}


	@Override
	public Role findById(Integer rolCod) {
		// TODO Auto-generated method stub
		return null;
	}


	@Override
	public void deleteById(int roleCod) {
		// TODO Auto-generated method stub
		
	}


}