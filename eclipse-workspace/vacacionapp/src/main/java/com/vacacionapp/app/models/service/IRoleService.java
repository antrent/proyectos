package com.vacacionapp.app.models.service;

import java.util.List;

import com.vacacionapp.app.models.entity.Role;


public interface IRoleService {

	
	public List<Role> findAll();
	
	public Role findById(Integer rolCod);

	public void save(Role role);

	public void deleteById(int roleCod);

}
