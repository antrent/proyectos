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

import com.vacacionapp.app.models.entity.Cargo;
import com.vacacionapp.app.models.entity.Departamento;
import com.vacacionapp.app.models.service.ICargoService;
import com.vacacionapp.app.models.service.IDepartamentoService;
import com.vacacionapp.app.util.paginator.PageRender;


@Secured(value= {"ROLE_ADMIN"})
@Controller
@RequestMapping("/cargo")
@SessionAttributes("cargo")
public class CargoController {

	@Autowired
	private ICargoService cargoService;
	
	@Autowired
	private IDepartamentoService departamentoService;
	
	
	@RequestMapping(value = {"/listarcargo"})
	public String listar(@RequestParam(name = "page", defaultValue = "0") int page,
						Model model, HttpServletRequest request) {
		
		Departamento departamento = new Departamento();
		
		//List<Cargo> cargo = cargoService.findAll();
		Pageable pageRequest = PageRequest.of(page, 7);
		Page<Cargo> cargo = cargoService.findAll(pageRequest);
		PageRender<Cargo> pageRender = new PageRender<>("listarcargo", cargo);		
	
		for(Cargo car : cargo)
		{
			departamento = departamentoService.findById(car.getDeptoCodigo());
		    car.setDepartamento(departamento);
		}

		model.addAttribute("page", pageRender);
		model.addAttribute("titulo", "Listado de Cargos");
		model.addAttribute("cargos", cargo);
		return "cargo/listarcargo";
	}	
	
	@RequestMapping(value = "/formcargo", method = RequestMethod.POST)
	public String guardar(@Valid Cargo cargo, BindingResult result, Model model, RedirectAttributes flash, SessionStatus status) {
		
		if (result.hasErrors()) {
			
			model.addAttribute("titulo", "Formulario de Cargo");
			List<Cargo> cargos = cargoService.findAll();
		
			List<Departamento> deptos =  departamentoService.findAll();
			model.addAttribute("deptos", deptos);
			
			model.addAttribute("cargos", cargos);
			
			return "cargo/formcargo";
		}		
		
		if (cargo.getActivo() == null) {
			cargo.setActivo("N");
		}
		if (cargo.getEsJefe() == null) {
			cargo.setEsJefe("N");
		}

		cargoService.save(cargo);
		
		status.setComplete();
		
		flash.addFlashAttribute("success","Cargo creado con exito..!");
		
		return "redirect:/cargo/listarcargo";

	}
	
	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/formcargo")
	public String crear(Map<String, Object> model) {

		Cargo cargo = new Cargo();
		
		List<Departamento> deptos =  departamentoService.findAll();
		model.put("deptos", deptos);
		
		model.put("cargo", cargo);
		model.put("titulo", "Formulario de Cargo");
		return "/cargo/formcargo";
	}
	
	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/formcargo/{cod}")
	public String editar(@PathVariable(value = "cod") Integer cod, Map<String, Object> model,
			RedirectAttributes flash) {

		Cargo cargo = null;
		



		if (cod > 0) {
			cargo = cargoService.findById(cod);
			if (cargo == null) {
				flash.addFlashAttribute("error", "El codigo del Cargo no existe en la BD!");
				return "redirect:/cargo/listarcargo";
			}
		} else {
			flash.addFlashAttribute("error", "El codigo del Cargo no puede se cero!");
			return "redirect:/cargo/listarcargo";
		}
		List<Departamento> deptos =  departamentoService.findAll();
		model.put("deptos", deptos);		
		
		model.put("cargo", cargo);
		model.put("titulo", "Editar Cargo");
		return "cargo/formcargo";
	}	

	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/eliminar/{cod}")
	public String eliminar(@PathVariable(value = "cod") Integer cod, RedirectAttributes flash) {
		
		if (cod > 0) {
			
			cargoService.deleteById(cod);
			
			flash.addFlashAttribute("success", "Cargo eliminado con exito!");
			
		}
		return "redirect:/cargo/listarcargo";
	}	
}

