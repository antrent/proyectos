package com.vacacionapp.app.controllers;

import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.SessionAttributes;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.vacacionapp.app.models.entity.Departamento;
import com.vacacionapp.app.models.service.IDepartamentoService;
import com.vacacionapp.app.util.paginator.PageRender;

@Secured(value= {"ROLE_ADMIN"})
@Controller
@RequestMapping("/departamento")
@SessionAttributes("departamento")
public class DepartamentoController {
	
	@Autowired
	private IDepartamentoService departamentoService; 

	@RequestMapping(value = {"/listardepto"})
	public String listar(@RequestParam(name = "page", defaultValue = "0") int page, Model model, HttpServletRequest request) {
		
		Pageable pageRequest = PageRequest.of(page, 7);
		Page<Departamento> depto = departamentoService.findAll(pageRequest);
		PageRender<Departamento> pageRender = new PageRender<>("listardepto", depto);		
		model.addAttribute("page", pageRender);
		//List<Departamento> depto = departamentoService.findAll();

		model.addAttribute("titulo", "Listado de Departamento");
		model.addAttribute("deptos", depto);
		return "departamento/listardepto";
	}

	@RequestMapping(value = "/formdepto", method = RequestMethod.POST)
	public String guardar(@Valid Departamento depto, BindingResult result, Model model, RedirectAttributes flash, SessionStatus status) {
		
		
		if (result.hasErrors()) {
		
			model.addAttribute("titulo", "Formulario de Departamento");
			List<Departamento> deptos = departamentoService.findAll();
			
			model.addAttribute("deptos", deptos);
			
			return "departamento/formdepto";
		}

		if (depto.getActivo() == null) {
			depto.setActivo("N");
		}
		
		departamentoService.save(depto);
		
		status.setComplete();
		
		flash.addFlashAttribute("success","Departamento creado con exito..!");
		
		return "redirect:/departamento/listardepto";

	}
	
	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/formdepto")
	public String crear(Map<String, Object> model) {

		Departamento depto = new Departamento();
		model.put("departamento", depto);
		model.put("titulo", "Formulario de Departamento");
		return "/departamento/formdepto";
	}

	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/formdepto/{cod}")
	public String editar(@PathVariable(value = "cod") Integer cod, Map<String, Object> model,
			RedirectAttributes flash) {

		Departamento depto = null;

		if (cod > 0) {
			depto = departamentoService.findById(cod);
			if (depto == null) {
				flash.addFlashAttribute("error", "El codigo del Departamento no existe en la BD!");
				return "redirect:/departamento/listardepto";
			}
		} else {
			flash.addFlashAttribute("error", "El codigo del Departamento no puede se cero!");
			return "redirect:/departamento/listardepto";
		}

		model.put("departamento", depto);
		model.put("titulo", "Editar Departamento");
		return "departamento/formdepto";
	}	

	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/eliminar/{cod}")
	public String eliminar(@PathVariable(value = "cod") Integer cod, RedirectAttributes flash) {
		
		if (cod > 0) {
			
			departamentoService.deleteById(cod);
			
			flash.addFlashAttribute("success", "Departamento eliminado con exito!");
			
		}
		return "redirect:/departamento/listardepto";
	}	
	
	
}
