package com.pruebatecnica.springboot.web.app.models.service;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.FlashMap;
//import org.springframework.web.servlet.support.SessionFlashMapManager;

import com.pruebatecnica.springboot.web.app.auth.handler.MiUser;
import com.pruebatecnica.springboot.web.app.models.dao.IEmpleadoDao;
//import com.pruebatecnica.springboot.web.app.auth.handler.MiUser;
//import com.vacacionapp.app.models.dao.IEmpleadoDao;
//import com.vacacionapp.app.models.dao.IRoleDao;
import com.pruebatecnica.springboot.web.app.models.entity.Empleado;
import com.pruebatecnica.springboot.web.app.util.lisval.RolEnum;

@Service("jpaUserDetailsService")
public class JpaUserDetailsService implements UserDetailsService {

	@Autowired
	private IEmpleadoDao empleadoDao;
	
	private Logger logger = LoggerFactory.getLogger(JpaUserDetailsService.class);
	
	@Override
	@Transactional(readOnly=true)
	public UserDetails loadUserByUsername(String usuario) throws UsernameNotFoundException {
		Empleado empleado = empleadoDao.findByUsuario(usuario);
		
		//SessionFlashMapManager flashMapManager = new SessionFlashMapManager();
		FlashMap flashMap = new FlashMap();		
		
		if(empleado == null) {
			logger.error("Error login: no existe el usuario '"+usuario+"'");
			throw new UsernameNotFoundException("Usuario "+usuario+" no existe en el sistema!"); 
		}
		
		List<GrantedAuthority> authorities = new ArrayList<GrantedAuthority>();
		for (RolEnum role: RolEnum.values() ) {
			if (empleado.getRol().equals(role.name()) ) {
				logger.info("Role: "+empleado.getRol());
				authorities.add(new SimpleGrantedAuthority(empleado.getRol()));
				
			}
		}		
		
		if(authorities.isEmpty()) {
			logger.error("Error login: usuario '"+usuario+"' no tiene roles asignado!");
			flashMap.put("error", "Error login: usuario '"+usuario+"' no tiene roles asignado!");
			throw new UsernameNotFoundException("Error login: usuario '"+usuario+"' no tiene roles asignado!"); 
		}		
		return new MiUser(String.valueOf(empleado.getId()),empleado.getUsuario(), empleado.getPassword(), authorities);
	}

}
