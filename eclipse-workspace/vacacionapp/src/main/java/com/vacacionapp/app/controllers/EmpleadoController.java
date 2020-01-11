package com.vacacionapp.app.controllers;


import java.io.IOException;
import java.net.MalformedURLException;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestWrapper;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.SessionAttributes;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.vacacionapp.app.models.entity.Empleado;
import com.vacacionapp.app.models.entity.Role;
import com.vacacionapp.app.models.service.IEmpleadoService;
import com.vacacionapp.app.models.service.IRoleService;
import com.vacacionapp.app.models.service.IUploadFileService;
import com.vacacionapp.app.util.paginator.PageRender;

@Controller
@SessionAttributes("empleado")
public class EmpleadoController {

	protected final Log logger = LogFactory.getLog(this.getClass());
	
	@Autowired
	private IEmpleadoService empleadoService;

	@Autowired
	private IUploadFileService uploadFileService;

	@Autowired
	private BCryptPasswordEncoder passwordEncoder;	
	
	@Autowired
	private IRoleService roleService;	
	
	@Secured("ROLE_USEREMP")
	@GetMapping(value = "/uploads/{filename:.+}")
	public ResponseEntity<Resource> verfoto(@PathVariable String filename) {

		Resource recurso = null;
		try {

				recurso = uploadFileService.load(filename);
			
		} catch (MalformedURLException e) {
			e.printStackTrace();
		}

		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + recurso.getFilename() + "\"")
				.body(recurso);

	}
	 
	@Secured({"ROLE_USEREMP","ROLE_USEREMPJEF","ROLE_ADMIN"})
	@GetMapping(value = "/ver/{cod}")
	public String ver(@PathVariable(value = "cod") int cod, 
					@RequestParam(name = "page", defaultValue = "0") int page, 
					Map<String, Object> model, RedirectAttributes flash) {

		/* probando codigo
			Pageable pageRequest = PageRequest.of(page, 7);

			Page<Empleado> empleados = empleadoService.findAll(pageRequest);
			
			PageRender<Empleado> pageRender = new PageRender<>("/ver", empleados);
			
			model.addAttribute("empleados", empleados);
			model.addAttribute("page", pageRender);
		 
		 /*fin prueba*/
		
		
		
		Empleado empleado = empleadoService.findById(cod);
		
		if (empleado == null) {
			flash.addFlashAttribute("error", "El emplado no existe en la BD!");
			return "redirect:/listar";
		}
		model.put("empleado", empleado);
		model.put("titulo", "Detalle empleado con Documento: "+empleado.getTipDocumento()+" "+ empleado.getNumDocumento()
											+" - Nombres: "+empleado.getPriNombre()+" "+empleado.getSegNombre()+" "+ empleado.getPriApellido()+" "+ empleado.getSegApellido()
											+" - Fecha Ingreso: "+empleado.getFechIngreso()
											);
		return "ver";
	}

	@RequestMapping(value = {"/listar","/"}, method = RequestMethod.GET)
	public String listar(@RequestParam(name = "page", defaultValue = "0") int page, Model model,
			Authentication authenticacion, 
			HttpServletRequest request) {
		
		if(authenticacion != null) {
			logger.info("Hola usuario autenticado, tu username es: ".concat(authenticacion.getName()));
		}
		
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		String codEmpleado = auth.getPrincipal().toString();
		
		
		//logger.info("Hola Antonio el usuario autenticado, tu username es: " + Integer.parseInt(codEmpleado));
		
		if(auth != null) {
			logger.info("Utilizando forma estática SecurityContextHolder.getContext().getAuthentication(): usuario autenticado, tu username es: ".concat(auth.getName()));
		}
		//Forma de validar role 1
		if(hasRole("ROLE_ADMIN")) {
			logger.info("Hola ".concat(auth.getName()).concat(" tienes acceso!"));
		}else {
			logger.info("Hola ".concat(auth.getName()).concat(" NO tienes acceso como ADMIN!"));
		}
		
		//Forma de validar role 2		
		SecurityContextHolderAwareRequestWrapper securityContext = new SecurityContextHolderAwareRequestWrapper(request, "ROLE_");
		
		if(securityContext.isUserInRole("ADMIN")) {
			logger.info("Forma usando SecurityContextHolderAwareRequestWrapper: Hola ".concat(auth.getName()).concat(" tienes acceso!"));
		}else {
			logger.info("Forma usando SecurityContextHolderAwareRequestWrapper: Hola ".concat(auth.getName()).concat(" NO tienes acceso!"));
		}
		
		//Forma de validar role 3		
		if(request.isUserInRole("ROLE_ADMIN")) {
			logger.info("Forma usando HttpServletRequest: Hola ".concat(auth.getName()).concat(" tienes acceso!"));
		}else {
			logger.info("Forma usando HttpServletRequest: Hola ".concat(auth.getName()).concat(" NO tienes acceso!"));
		}		
		
		
		
		if(hasRole("ROLE_ADMIN")) {
			Pageable pageRequest = PageRequest.of(page, 7);

			Page<Empleado> empleados = empleadoService.findAll(pageRequest);
			
			PageRender<Empleado> pageRender = new PageRender<>("/listar", empleados);
			model.addAttribute("titulo", "Listado de Empleados");
			model.addAttribute("empleados", empleados);
			model.addAttribute("page", pageRender);
		}else {

			Empleado empleado = empleadoService.findById(Integer.parseInt(codEmpleado));
			model.addAttribute("titulo", "Empleado");	
			model.addAttribute("empleados", empleado);
		}
		
		return "listar";
	}

	//@SuppressWarnings("null")
	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/form")
	public String crear(Map<String, Object> model) {

		
		Empleado empleado = new Empleado();
		List<Role> roles = roleService.findAll();
		
		model.put("empleado", empleado);
		model.put("roles", roles);		
		model.put("titulo", "Formulario de Empleado");
		return "form";
	
	}

	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/form/{cod}")
	public String editar(@PathVariable(value = "cod") Integer cod, Map<String, Object> model,
			RedirectAttributes flash) {

		Empleado empleado = null;

		if (cod >= 0) {
			empleado = empleadoService.findById(cod);
			if (empleado == null) {
				flash.addFlashAttribute("error", "El codigo del Empleado no existe en la BD!");
				return "redirect:/listar";
			}
		} /*else {
			flash.addFlashAttribute("error", "El codigo del Empleado no puede se cero!");
			return "redirect:/listar";
		}*/

		List<Role> roles = roleService.findAll();
		model.put("roles", roles);				
		
		model.put("empleado", empleado);
		model.put("titulo", "Editar Empleado");
		return "form";
	}

	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/form", method = RequestMethod.POST)
	public String guardar(@Valid Empleado empleado, BindingResult result, Model model,
			@RequestParam("file") MultipartFile foto, RedirectAttributes flash, SessionStatus status) {

		
		if (result.hasErrors()) {
			model.addAttribute("titulo", "Formulario Empleado");
			return "form";
		}
		
		if (!foto.isEmpty()) {

			if (empleado.getCodigo() != null && empleado.getCodigo() > 0 && empleado.getFoto() != null
					&& empleado.getFoto().length() > 0) {
				uploadFileService.delete(empleado.getFoto());
			}

			String uniqueFilename = null;
			try {
				uniqueFilename = uploadFileService.copy(foto);
			} catch (IOException e) {
				
				e.printStackTrace();
			}

			flash.addFlashAttribute("info", "Has subido correctamente la foto '" + uniqueFilename + "'");
			empleado.setFoto(uniqueFilename);
		}

		if (empleado.getActivo() == null) {
			empleado.setActivo("N");
		}

		if (empleado.getPassword() == null) {
			
			empleado.setPassword(passwordEncoder.encode(empleado.getNumDocumento()));
		}else {
			empleado.setPassword(passwordEncoder.encode(empleado.getNumDocumento()));
		}
		
		//empleado.setPassword(passwordEncoder.encode(empleado.getNumDocumento()));
		
		
		String mensajeFlash = (empleado.getCodigo() != null) ? "Empleado editado con exito!"
				: "Empleado creado con exito, por favor asignar cargo!";
		
		empleadoService.save(empleado); 
		
		status.setComplete();
		
		flash.addFlashAttribute("success", mensajeFlash);
		return "redirect:listar";
		
		//return "redirect:detempleadocargo/formempleadocargo/"+empleado.getCodigo();
	}

	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/eliminar/{cod}")
	public String eliminar(@PathVariable(value = "cod") Integer cod, RedirectAttributes flash) {
		if (cod > 0) {
			Empleado empleado = empleadoService.findById(cod);
			empleadoService.deleteById(cod);
			flash.addFlashAttribute("success", "Empleado eliminado con exito!");
			
			if (empleado.getFoto() != null) { 
				if (uploadFileService.delete(empleado.getFoto())) {
					flash.addFlashAttribute("info", "Foto " + empleado.getFoto() + " eliminada con exito!");
				}
			}
		}
		return "redirect:/listar";
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
		
		return authorities.contains(new SimpleGrantedAuthority(role));
		
		/*//buscando si el usuario tiene un rol determinado. 
		for(GrantedAuthority authority: authorities) {
			if (role.equals(authority.getAuthority())) {
				logger.info("Hola usuario ".concat(auth.getName()).concat(" tu rol es: ".concat(authority.getAuthority())));
				return true;
			}
		}
		return false;*/
	} 

	
}
