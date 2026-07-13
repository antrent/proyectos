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

import com.vacacionapp.app.models.entity.Festivo;
import com.vacacionapp.app.models.service.IFestivoService;
import com.vacacionapp.app.util.paginator.PageRender;

@Secured(value= {"ROLE_ADMIN"})
@Controller
@RequestMapping("/festivo")
@SessionAttributes("festivo")
public class FestivoController {
	
	@Autowired
	private IFestivoService festivoService;

	@RequestMapping(value = {"/listarfestivo"})
	public String listar(Model model, HttpServletRequest request) {
		 
		  List<Festivo> festivo = festivoService.findAll();

		model.addAttribute("titulo", "Listado de Festivos");
		model.addAttribute("festivos", festivo);
		
		return "festivo/listarfestivo";
	}
	
	@RequestMapping(value = "/formfestivo", method = RequestMethod.POST)
	public String guardar(@Valid Festivo festivo, BindingResult result,
			Model model, RedirectAttributes flash, SessionStatus status) {
		
		if (result.hasErrors()) {
			model.addAttribute("titulo", "Formulario de Festivos");
			List<Festivo> festivos = festivoService.findAll();
			model.addAttribute("festivos", festivos);
			return "festivo/formfestivo";
		}
		
		festivoService.save(festivo);
		status.setComplete();
		flash.addFlashAttribute("success","Festivo creado con exito..!");
		return "redirect:formfestivo";

	}	
	
	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/formfestivo")
	public String crear(@RequestParam(name = "page", defaultValue = "0") int page, Map<String, Object> model) {

		Festivo festivo = new Festivo();
		Pageable pageRequest = PageRequest.of(page, 7);
		Page<Festivo> festivos = festivoService.findAll(pageRequest);
		PageRender<Festivo> pageRender = new PageRender<>("formfestivo", festivos);
		model.put("festivo", festivo);
		model.put("festivos", festivos);
		model.put("titulo", "Formulario de Festivos");
		model.put("page", pageRender);		
		
		
		/*  Codigo originales
				Festivo festivo = new Festivo();
				List<Festivo> festivos = festivoService.findAll();
				model.put("festivo", festivo);
				model.put("festivos", festivos);
				model.put("titulo", "Formulario de Festivos");
				*/
		return "festivo/formfestivo";
	}	
	
	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/formfestivo/{cod}")
	public String editar(@PathVariable(value = "cod") Integer cod, 
						 @RequestParam(name = "page", defaultValue = "0") int page, Map<String, Object> model,
						 RedirectAttributes flash) {

		Festivo festivo = null;

		if (cod > 0) {
			festivo = festivoService.findById(cod);
			if (festivo == null) {
				flash.addFlashAttribute("error", "El codigo del Festivo no existe en la BD!");
				return "redirect:/festivo/listarfestivo";
			}
		} else {
			flash.addFlashAttribute("error", "El codigo del Festivo no puede se cero!");
			return "redirect:/festivo/listarfestivo";
		}

		Pageable pageRequest = PageRequest.of(page, 7);
		Page<Festivo> festivos = festivoService.findAll(pageRequest);
		PageRender<Festivo> pageRender = new PageRender<>("formfestivo", festivos);		
		
		model.put("festivo", festivo);
		model.put("festivos", festivos);
		model.put("titulo", "Editar Festivo");
		model.put("page", pageRender);
		return "festivo/formfestivo";
	}
	
	
	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/eliminar/{cod}")
	public String eliminar(@PathVariable(value = "cod") Integer cod, RedirectAttributes flash) {
		
		if (cod > 0) {
			
			festivoService.deleteById(cod);
			
			flash.addFlashAttribute("success", "Festivo eliminado con exito!");
			
		}
		return "redirect:/festivo/formfestivo";
	}	
	
}
