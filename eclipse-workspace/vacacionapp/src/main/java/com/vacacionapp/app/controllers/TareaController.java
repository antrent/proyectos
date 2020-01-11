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

import com.vacacionapp.app.models.entity.Tarea;
import com.vacacionapp.app.models.service.ITareaService;
import com.vacacionapp.app.util.paginator.PageRender;

@Secured(value= {"ROLE_ADMIN"})
@Controller
@RequestMapping("/tarea")
@SessionAttributes("tarea")
public class TareaController {

	@Autowired
	private ITareaService tareaService;
	
	@RequestMapping(value = {"/listartarea"})
	public String listar(Model model, HttpServletRequest request) {
		 
		  List<Tarea> tareas = tareaService.findAll();

		model.addAttribute("titulo", "Listado de Tareas");
		model.addAttribute("tareas", tareas);
		
		return "tarea/listartarea";
	}

	@RequestMapping(value = "/formtarea", method = RequestMethod.POST)
	public String guardar(@Valid Tarea tarea, BindingResult result,
			Model model, RedirectAttributes flash, SessionStatus status) {
		
		if (result.hasErrors()) {
			model.addAttribute("titulo", "Formulario de Tarea");
			List<Tarea> tareas = tareaService.findAll();
			model.addAttribute("tareas", tareas);
			return "tarea/formtarea";
		}
		
		tareaService.save(tarea);
		status.setComplete();
		flash.addFlashAttribute("success","Tarea creada con exito..!");
		return "redirect:formtarea";

	}	

	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/formtarea")
	public String crear(@RequestParam(name = "page", defaultValue = "0") int page, Map<String, Object> model) {

		Tarea tarea = new Tarea();
		Pageable pageRequest = PageRequest.of(page, 5);
		Page<Tarea> tareas = tareaService.findAll(pageRequest);
		PageRender<Tarea> pageRender = new PageRender<>("formtarea", tareas);
		model.put("tarea", tarea);
		model.put("tareas", tareas);
		model.put("titulo", "Formulario de Tareas");
		model.put("page", pageRender);		
		
		return "tarea/formtarea";
	}	

	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/formtarea/{cod}")
	public String editar(@PathVariable(value = "cod") Integer cod, 
						 @RequestParam(name = "page", defaultValue = "0") int page, Map<String, Object> model,
						 RedirectAttributes flash) {

		Tarea tarea = null;

		if (cod > 0) {
			tarea = tareaService.findById(cod);
			if (tarea == null) {
				flash.addFlashAttribute("error", "El codigo de la Tarea no existe en la BD!");
				return "redirect:/tarea/listartarea";
			}
		} else {
			flash.addFlashAttribute("error", "El codigo de la Tarea no puede se cero!");
			return "redirect:/tarea/listartarea";
		}

		Pageable pageRequest = PageRequest.of(page, 7);
		Page<Tarea> tareas = tareaService.findAll(pageRequest);
		PageRender<Tarea> pageRender = new PageRender<>("formtarea", tareas);		
		
		model.put("tarea", tarea);
		model.put("tareas", tareas);
		model.put("titulo", "Editar Tarea");
		model.put("page", pageRender);
		return "tarea/formtarea";
	}	

	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/eliminar/{cod}")
	public String eliminar(@PathVariable(value = "cod") Integer cod, RedirectAttributes flash) {
		
		if (cod > 0) {
			
			tareaService.deleteById(cod);
			
			flash.addFlashAttribute("success", "Tarea eliminada con exito!");
			
		}
		return "redirect:/tarea/formtarea";
	}	
	
}
