package com.vacacionapp.app.controllers;

import java.util.Date;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.SessionAttributes;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.vacacionapp.app.models.entity.Cargo;
import com.vacacionapp.app.models.entity.DetEmpleadoCargo;
import com.vacacionapp.app.models.entity.Empleado;
import com.vacacionapp.app.models.service.ICargoService;
import com.vacacionapp.app.models.service.IDetEmpleadoCargoService;
import com.vacacionapp.app.models.service.IEmpleadoService;


@Secured(value= {"ROLE_ADMIN"})
@Controller
@RequestMapping("/detempleadocargo")
@SessionAttributes("detempleadocargo")
public class DetEmpleadoCargoController {

	@Autowired
	private IDetEmpleadoCargoService detEmpleadoCargoService;
	
	@Autowired
	private IEmpleadoService empleadoService;	

	@Autowired
	private ICargoService cargoService;	
	
	@RequestMapping(value = {"/listarempleadocargo/{codempleadoCargo}"})
	public String listar(@PathVariable(value="codempleadoCargo") int codempleadoCargo, Model model, HttpServletRequest request) {
		
		List<DetEmpleadoCargo> EmpleadoCargo = detEmpleadoCargoService.findByEmpCodigo(codempleadoCargo);

		model.addAttribute("titulo", "Listado de cargos por empleado");
		model.addAttribute("codempleadocargo", codempleadoCargo);
		model.addAttribute("detEmpleadoCargos", EmpleadoCargo);
		return "listarempleadocargo";
	}	

	@RequestMapping(value = "/formempleadocargo", method = RequestMethod.POST)
	//@PostMapping("/formempleadocargo")
	public String guardar(@Valid DetEmpleadoCargo detEmpleadoCargo, BindingResult result, Model model, RedirectAttributes flash, SessionStatus status) {
	
		
		java.util.Date fechaHoy = new Date();
		
		DetEmpleadoCargo EmpleadoCargoFechFin = detEmpleadoCargoService.findByEmpCodigoFechFin(detEmpleadoCargo.getEmpCodigo());
		if (EmpleadoCargoFechFin != null) {
			if (EmpleadoCargoFechFin.getFechFin() == null) {
				EmpleadoCargoFechFin.setFechFin(fechaHoy);
				detEmpleadoCargoService.save(EmpleadoCargoFechFin);
			}
		}
		
		detEmpleadoCargo.setFechRegistro(fechaHoy);
		detEmpleadoCargoService.save(detEmpleadoCargo);
		
		status.setComplete();
		
		flash.addFlashAttribute("success","Cargo asignado con exito..!");
		
		return "redirect:/listar";

	}	

	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/formempleadocargo/{empleadoCod}")
	public String crear(@PathVariable(value="empleadoCod") int empleadoCod, Map<String, Object> model, RedirectAttributes flash) {

		Empleado empleado = empleadoService.findById(empleadoCod);
		
		
		DetEmpleadoCargo detEmpleadoCargo = new DetEmpleadoCargo();
		
		detEmpleadoCargo.setEmpleado(empleado);
		List<Cargo> cargo = cargoService.findAll();
		
		
		model.put("detempleadocargos", detEmpleadoCargo);
		model.put("titulo", "Formulario de Cargo por Empleado");
		model.put("cargos", cargo);
		
		return "formempleadocargo";
	}
	
	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/formdetempleadocargo/{cod}")
	public String editar(@PathVariable(value = "cod") Integer cod, Map<String, Object> model,
			RedirectAttributes flash) {

		DetEmpleadoCargo detEmpleadoCargo = null;

		if (cod > 0) {
			detEmpleadoCargo = detEmpleadoCargoService.findById(cod);
			if (detEmpleadoCargo == null) {
				flash.addFlashAttribute("error", "El codigo del Cargo para el empleado no existe en la BD!");
				return "redirect:/detempleadocargo/listarempleadocargo/"+cod;
			}
		} else {
			flash.addFlashAttribute("error", "El codigo del Cargo para el empleado no puede se cero!");
			return "redirect:/listarempleadocargo";
		}

		model.put("detEmpleadoCargo", detEmpleadoCargo);
		model.put("titulo", "Editar Cargo por Empleado");
		//return "detempleadocargo/listarempleadocargo/"+cod;
		return "detempleadocargo/formempleadocargo/";
		
	}	
	
}
