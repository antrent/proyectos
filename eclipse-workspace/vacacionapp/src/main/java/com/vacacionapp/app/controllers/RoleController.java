package com.vacacionapp.app.controllers;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.SessionAttributes;

import com.vacacionapp.app.models.entity.Role;
import com.vacacionapp.app.models.service.IRoleService;

@Secured(value= {"ROLE_ADMIN"})
@Controller
@RequestMapping("/rol")
@SessionAttributes("rol")
public class RoleController {
	
	@Autowired
	private IRoleService roleService;
	
	
	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/formrol")
	public String crear(Map<String, Object> model) {

		List<Role> roles =  roleService.findAll(); //buscamos todos los roles
		
		model.put("roles", roles); //enviamos a la pagina todos los roles encontrados.
		model.put("titulo", "Formulario de Roles");
		return "rol/formrol";
		
	}
	
	
}