package com.pruebatecnica.springboot.web.app.controllers;

import java.util.Collection;
//import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
//import org.springframework.security.access.annotation.Secured;
//import org.springframework.security.access.annotation.Secured;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
//import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestWrapper;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.SessionAttributes;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.pruebatecnica.springboot.web.app.models.dao.IEmpleadoDao;
import com.pruebatecnica.springboot.web.app.models.entity.Empleado;
import com.pruebatecnica.springboot.web.app.util.paginator.PageRender;





@Controller
@SessionAttributes("empleado")
public class EmpleadoController {

	protected final Log logger = LogFactory.getLog(this.getClass());
	
	@Autowired
	private IEmpleadoDao empleadoDao;
	
	
	//@Autowired
	//private BCryptPasswordEncoder passwordEncoder;	
	
	//@Secured({"USEREMP","ADMIN"})
	@RequestMapping(value=  {"/listar","/"}, method=RequestMethod.GET)
	public String listar(@RequestParam(name = "page", defaultValue = "0") int page,Model model,
			Authentication authenticacion,
			HttpServletRequest request
			) {
		
		if(authenticacion != null) {
			logger.info("Hola usuario autenticado, tu username es: ".concat(authenticacion.getName()));
		}
		
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		String idEmpleado = auth.getPrincipal().toString();
		logger.info("idEmpleado  es:  ".concat(idEmpleado));
		
		
		if(auth != null) {
			logger.info("Utilizando forma estática SecurityContextHolder.getContext().getAuthentication(): usuario autenticado, tu username es: ".concat(auth.getName()));
		}
		

		
		//Forma de validar role 1
		if(hasRole("ADMIN")) {
			logger.info("Hola ".concat(auth.getName()).concat(" tienes acceso!"));
		}else {
			logger.info("Hola ".concat(auth.getName()).concat(" NO tienes acceso como ADMIN!"));
		}		

		//Forma de validar role 2		
		SecurityContextHolderAwareRequestWrapper securityContext = new SecurityContextHolderAwareRequestWrapper(request, "ROLE_");
		
		if(securityContext.isUserInRole("ROLE_ADMIN")) {
			logger.info("Forma usando SecurityContextHolderAwareRequestWrapper: Hola ".concat(auth.getName()).concat(" tienes acceso!"));
		}else {
			logger.info("Forma usando SecurityContextHolderAwareRequestWrapper: Hola ".concat(auth.getName()).concat(" NO tienes acceso!"));
		}
		
		
		Pageable pageRequest = PageRequest.of(page, 10);
		Page<Empleado> empleados = empleadoDao.findAll(pageRequest);
		PageRender<Empleado> pageRender = new PageRender<>("/listar", empleados);
		model.addAttribute("titulo", "Listado de Empleados");
		model.addAttribute("empleados", empleadoDao.findAll());		
		model.addAttribute("page", pageRender);
		
		return "listar";
	}
	
	//@Secured({"USEREMP","ADMIN"})	
	@RequestMapping(value="/form")
	public String crear(Map<String, Object> model) {
		
		Empleado empleado  = new Empleado();
		model.put("empleado", empleado);
		model.put("titulo", "Formulario de Empleado");
		return "form";
	}
	
	//@Secured({"USEREMP","ADMIN"})	
	@RequestMapping(value="/form",method=RequestMethod.POST)
	public String grabar(@Valid Empleado empleado, BindingResult result, Model model) {
		
		if (result.hasErrors()) {
			model.addAttribute("titulo", "Formulario Empleado");
			return "form";
		}
		empleadoDao.save(empleado);
		return "redirect:listar";
	}	

	//@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/form/{id}")
	public String editar(@PathVariable(value = "id") Integer id, Map<String, Object> model,
			RedirectAttributes flash) {

		Empleado empleado = null;

		if (id >= 0) {
			empleado = empleadoDao.findOne(id);
			if (empleado == null) {
				flash.addFlashAttribute("error", "El codigo del Empleado no existe en la BD!");
				return "redirect:/listar";
			}
		} 

		model.put("empleado", empleado);
		model.put("titulo", "Editar Empleado");
		return "form";
	}	
	
	
	
	//@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/eliminar/{id}")
	public String eliminar(@PathVariable(value = "id") Integer id, RedirectAttributes flash) {
		if (id > 0) {
			Empleado empleado = empleadoDao.findOne(id);
			empleadoDao.deleteById(id);
			flash.addFlashAttribute("success", "Empleado eliminado con exito!");
		}
		return "redirect:/listar";
	}	
	
	//@Secured("ROLE_ADMIN")
		@RequestMapping(value = "/buscaremail/{email}")
	public String buscarEmail(@PathVariable(value = "email") String email, RedirectAttributes flash) {
			if (email != null) {
				//Empleado empleado = empleadoDao.findOne(id);
				
			}
			return "form";
	}	
	
	private boolean hasRole(String role) {
		SecurityContext context = SecurityContextHolder.getContext(); 
		
		if(context == null) {
			return false;
		}
		
		Authentication auth = context.getAuthentication();
		 
		if(auth == null) {
			return false;
		}
		
		Collection<? extends GrantedAuthority> authorities = auth.getAuthorities(); 
		
		
		logger.info("Hola ".concat(auth.getName()).concat(" NO tienes acceso como ADMIN!")+role);
		return authorities.contains(new SimpleGrantedAuthority(role));
		
	}	
	
	private boolean valString(String string) {

		String regex = "[A-Z]([a-z]+|\\s[a-z]+)";
		boolean correcto = Pattern.matches(regex, string);
		if(correcto) {
			return true;
		}else {
			return false;
		}
	}		
	
}
