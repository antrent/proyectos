package com.vacacionapp.app.models.service;

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
import com.vacacionapp.app.auth.handler.MiUser;
import com.vacacionapp.app.models.dao.IEmpleadoDao;
import com.vacacionapp.app.models.dao.IRoleDao;
import com.vacacionapp.app.models.entity.Empleado;
import com.vacacionapp.app.models.entity.Role;

@Service("jpaUserDetailsService")
public class JpaUserDetailsService implements UserDetailsService {

	@Autowired
	private IEmpleadoDao empladoDao;
	
	
	@Autowired
	private IRoleDao rolDao;
	

	private Logger logger = LoggerFactory.getLogger(JpaUserDetailsService.class);
	
	@Override
	@Transactional(readOnly=true)
	public UserDetails loadUserByUsername(String usuario) throws UsernameNotFoundException {
		Empleado empleado = empladoDao.findByUsuario(usuario);
		
		//SessionFlashMapManager flashMapManager = new SessionFlashMapManager();
		FlashMap flashMap = new FlashMap();		
		
		if(empleado == null) {
			logger.error("Error login: no existe el usuario '"+usuario+"'");
			throw new UsernameNotFoundException("Usuario "+usuario+" no existe en el sistema!"); 
		}
		
		List<GrantedAuthority> authorities = new ArrayList<GrantedAuthority>();
		
		
		
		/*for (EmpleadoRole role: empleado.getEmpleadoRoles() ) {
			logger.info("Role: ".concat(role.getRolCodigo()));
 
			authorities.add(new SimpleGrantedAuthority(role.getRolCodigo()));

		}
		*/
		for (Role role: rolDao.findAll() ) {
			
			if (empleado.getRol().equals(role.getRolCodigo()) ) {
			
				logger.info("Role: "+empleado.getRol());
				 
				authorities.add(new SimpleGrantedAuthority(empleado.getRol()));
			}

		}		
		
		if(authorities.isEmpty()) {
			//logger.error("Error login: usuario '"+usuario+"' no tiene roles asignado!");
			flashMap.put("error", "Error login: usuario '"+usuario+"' no tiene roles asignado!");
			throw new UsernameNotFoundException("Error login: usuario '"+usuario+"' no tiene roles asignado!"); 
		}		
		
		return new MiUser(String.valueOf(empleado.getCodigo()),empleado.getUsuario(), empleado.getPassword(), authorities);
	}

}
