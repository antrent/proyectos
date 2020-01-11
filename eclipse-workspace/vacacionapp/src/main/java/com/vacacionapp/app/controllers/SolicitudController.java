package com.vacacionapp.app.controllers;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.SessionAttributes;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.vacacionapp.app.models.dao.ISolicitudDao;
import com.vacacionapp.app.models.entity.Empleado;
import com.vacacionapp.app.models.entity.Solicitud;
import com.vacacionapp.app.models.service.IEmpleadoService;
import com.vacacionapp.app.models.service.ISolicitudService;
import com.vacacionapp.app.util.mail.EnvioMail;
import com.vacacionapp.app.util.paginator.PageRender;

@Secured(value= {"ROLE_ADMIN","ROLE_USEREMP","ROLE_USEREMPJEF"})
@Controller
@RequestMapping("/solicitud")
@SessionAttributes("solicitud")
public class SolicitudController {
	
	@Autowired
	private IEmpleadoService empleadoService;
	
	@Autowired
	private ISolicitudService solicitudService;
	
	@Autowired
	private ISolicitudDao solicitudDao;

	@GetMapping("/form/{empleadoCod}")
	public String crear(@PathVariable(value="empleadoCod") int empleadoCod, Map<String, Object> model,  RedirectAttributes flash) {
		
		//Formato de la fecha
		//SimpleDateFormat formatter = new SimpleDateFormat("dd/MM/yyyy");
		SimpleDateFormat formatterAnio = new SimpleDateFormat("yyyy");
		//int anioInicio = 0;
		int anioActual = 0;
		Date fechaHoy = new Date();
		Empleado empleado = empleadoService.findById(empleadoCod);

		if(empleado == null) {
			flash.addAttribute("error", "El empleado no existe ne la Base de Datos");
			return "redirect:/listar";
		}
		
		Solicitud solicitud = new Solicitud();
		solicitud.setEmpleado(empleado);
		solicitud.calcularDias();
		solicitud.setEstSolCodigo("E");
		//anioInicio = Integer.parseInt(formatterAnio.format(empleado.getFechIngreso()));
		anioActual = Integer.parseInt(formatterAnio.format(fechaHoy));		

		if(empleadoService.contSolByEmplAndAnio(solicitud.getCodigoEmpSolicita(),anioActual) == 0){
			solicitud.setFechIni(empleado.getFechIngreso());
			//solicitud.setDiasTotalPeriodo(15);
		}else {
			solicitud.setFechIni(empleadoService.maxFechIniSolByEmpl(solicitud.getCodigoEmpSolicita()));
			solicitud.setFechFin(empleadoService.maxFechFinSolByEmpl(solicitud.getCodigoEmpSolicita()));
		}
		
		model.put("solicitud", solicitud);
		model.put("titulo", "Crear Solicitud");
		
		return "solicitud/form";
	}	
	
	@GetMapping("/formaprobar/{codEmpJef}/{codSolEmp}/{codEmpSol}/{codEstado}")
	//@RequestMapping(value = "/formaprobar/{codEmpJef}/{codSolEmp}/{codEmpSol}/{codEstado}")
	public String editar(@PathVariable(value="codEmpJef") int codEmpJef,
						 @PathVariable(value="codSolEmp") int codSolEmp, 
						 @PathVariable(value="codEmpSol") int codEmpSol,
						 @PathVariable(value="codEstado") String codEstado,
						 Map<String, Object> model,  RedirectAttributes flash, SessionStatus status) {
		
		String sunto = null;//"Solicitud aprobada";
		String mensaje = "La Solicitud de vacaciones fue";
		
		model.put("titulo", "Aprobar Solicitud");
		
		EnvioMail envioMail = new EnvioMail();
		
		
		if (codSolEmp > 0 && codEmpSol > 0 && (codEstado.equals("A") || codEstado.equals("R"))) {
			Date fechaHoy = new Date();
			Solicitud	solicitud = empleadoService.findByCodEmpByCodSol(codEmpSol ,codSolEmp);
			
			solicitud.setEstSolCodigo(codEstado);
			solicitud.setCodigoEmpAprueba(codEmpJef) ;
			solicitud.setFechAprobacion(fechaHoy);
			
			empleadoService.saveSolicitud(solicitud);
			status.setComplete();
			
			if (codEstado.equals("A")) {
				sunto = "Solicitud aprobada";
				mensaje = mensaje + "Aprobada";
			}else{
				sunto = "Solicitud rechazada";
				mensaje = mensaje + "Rechazada";
			}
			
			String mensajeFlash =(codEstado.equals("A")) ? sunto+" con exito!" : sunto+" con exito" ;
			
			String emailEmpleado = empleadoService.findById(codEmpSol).getEmail();
			String emailJefe = empleadoService.findById(codEmpJef).getEmail();
			
			
			envioMail.SendMail(emailJefe, emailEmpleado,sunto,mensaje);			
			
			model.put("success", mensajeFlash);
		}
		
		Empleado empleado = new Empleado();
		
		System.out.println("Antonio Editar codEstado "+codEstado);
		
		List<Solicitud> solicitudes = empleadoService.findByCodBySolByEmpJef(codEmpJef,codEstado);		
		for(Solicitud sol : solicitudes)
		{
		    empleado = empleadoService.findById(sol.getCodigoEmpSolicita());
		    sol.setEmpleado(empleado);
		}
	    
		model.put("solicitudes", solicitudes);

		return "solicitud/formaprobar";
	}

	@PostMapping("/form" )
	public String guardar(Solicitud solicitud, BindingResult result, Model model, RedirectAttributes flash, SessionStatus status) {
		
		solicitud.calcularDias();
		
		if (solicitud.getFechSalida() == null || solicitud.getFechReingreso() == null) {
			flash.addFlashAttribute("error", "NO pedes crear esta Solicitud, la fecha de Salida o Reingreso no pueden ser nulas, por favor verifique (Fecha salida) y (Fecha reingreso)..!");
			return "redirect:/solicitud/form/"+solicitud.getCodigoEmpSolicita();
		}
		if(solicitud.getDiasSolicitados() <= 0) {
			flash.addFlashAttribute("error", "Los (Dias solicitados) no pueden ser negativos, por favor verifique (Fecha salida) y (Fecha reingreso)..!");
			return "redirect:/solicitud/form/"+solicitud.getCodigoEmpSolicita();
			
		}		
		if (solicitudDao.findByCodEmpByEstado(solicitud.getCodigoEmpSolicita()) > 0) {
			flash.addFlashAttribute("error", "NO pedes crear esta Solicitud, actualmente tienes una solicitud en estudio, la cual debe ser aprobada o rechazada por tu jefe..!");
			return "redirect:/solicitud/form/"+solicitud.getCodigoEmpSolicita();
		}
		
		if (solicitudDao.findByCodEmpByFech(solicitud.getCodigoEmpSolicita(), solicitud.getFechIni(), solicitud.getFechFin(), solicitud.getFechSalida(), solicitud.getFechReingreso()) > 0) {
			flash.addFlashAttribute("error", "NO pedes crear esta Solicitud, fechas de Salida y Reingreso estan traslapadas con otra solicitud para en el periodo...");
			return "redirect:/solicitud/form/"+solicitud.getCodigoEmpSolicita();
		}
		
		empleadoService.saveSolicitud(solicitud);
		
		status.setComplete();
		
		
		
		flash.addFlashAttribute("codigoEmpSolicita",solicitud.getCodigoEmpSolicita());
		flash.addFlashAttribute("success","Solicitud creada con exito..!");
		
		return "redirect:/ver/"+solicitud.getEmpleado().getCodigo();
		//return "redirect:/ver/"+solicitud.getEmpleado().getCodigo()+"?format=pdf"; //importante codigo para generar el pdf y envio de email

	}

	@GetMapping(value="/contarfestivo/{fechSal}/{fechFin}", produces="application/json")
	public @ResponseBody int contarFestivo(@PathVariable String fechSal,@PathVariable String fechFin) {
		return empleadoService.contFestivo(fechSal, fechFin);
	}
	
	@GetMapping("/listarsolicitud/{fechSolicitudIni}/{fechSolicitudFin}/")
	public String listarfiltro(@PathVariable String fechSolicitudIni, 
							   @PathVariable String fechSolicitudFin,
							   Map<String, Object> model,  RedirectAttributes flash, SessionStatus status) {
		
		System.out.println("Antonio 1fechSolicitudIni "+fechSolicitudIni+" 1fechSolicitudFin "+fechSolicitudFin);

		List<Solicitud> solicitudes = null;
		String anio = null;
		String mes = null;
		String dia = null;
		if(fechSolicitudIni.equals("0") && fechSolicitudFin.equals("0") ) {
			solicitudes = solicitudService.findAll();	
		}else {
			if (fechSolicitudIni.equals("1")) { 
				fechSolicitudIni = null;
			}else {
			   String[] v_fechSolicitudIni = fechSolicitudIni.split("-");
				 anio = v_fechSolicitudIni[0];
				 mes = v_fechSolicitudIni[1];
				 dia = v_fechSolicitudIni[2];
				 fechSolicitudIni = dia+"-"+mes+"-"+anio; 				
			}
			if(fechSolicitudFin.equals("1")) {
				fechSolicitudFin = null;
			}else {
				String[] v_fechSolicitudFin = fechSolicitudFin.split("-");
				anio = v_fechSolicitudFin[0];
				mes = v_fechSolicitudFin[1];
				dia = v_fechSolicitudFin[2];
				fechSolicitudFin = dia+"-"+mes+"-"+anio;
			}
			solicitudes = solicitudService.findByAllByFechSolicitud(fechSolicitudIni, fechSolicitudFin);
		}
			
			model.put("solicitudes", solicitudes);			
			
		return "solicitud/listarsolicitud";
	}
	
	@GetMapping("/listarsolicitud")
	public String listar(@RequestParam(name = "fechSolicitudIni", defaultValue = "") String fechSolicitudIni, 
  					     @RequestParam(name = "fechSolicitudFin", defaultValue = "") String fechSolicitudFin,
  					     @RequestParam(name = "descarga", defaultValue = "") String descarga,
  					     @RequestParam(name = "page", defaultValue = "0") int page,
  					     Map<String, Object> model,  RedirectAttributes flash, SessionStatus status) {
		
		    Pageable pageRequest = PageRequest.of(page, 10);
			Page<Solicitud> solicitud = solicitudService.findAll(pageRequest);
			PageRender<Solicitud> pageRender = new PageRender<>("/solicitud/listarsolicitud", solicitud);
			model.put("titulo", "Informe de Solicitudes por fecha");
			model.put("solicitud", solicitud);
			model.put("page", pageRender);
			
			System.out.println("Antonio En error solicitud "+solicitud.getTotalPages());
			
			if(((fechSolicitudIni.length() == 0 && fechSolicitudFin.length() == 0) || (fechSolicitudIni.isEmpty() && fechSolicitudFin.isEmpty())) && descarga.length() == 0 ) { 
				
				System.out.println("Antonio En error ");
				
				return "/solicitud/listarsolicitud";
			} else {
				
				if (((fechSolicitudIni.length() == 0 || fechSolicitudFin.length() == 0) || (fechSolicitudIni.isEmpty() || fechSolicitudFin.isEmpty())) && descarga.equals("T")){
					if(fechSolicitudIni.length() == 0 && fechSolicitudFin.length() > 0) {
						fechSolicitudIni = "1";
					}else if(fechSolicitudFin.length() == 0 && fechSolicitudIni.length() > 0) {
						fechSolicitudFin = "1";
					} else if(fechSolicitudIni.length() == 0 && fechSolicitudFin.length() == 0){
						fechSolicitudIni = "0";
						fechSolicitudFin = "0";
					}
				}
				System.out.println("Antonio En error 2");
				
				return "redirect:/solicitud/listarsolicitud/"+fechSolicitudIni+"/"+fechSolicitudFin+"/?format=xlsx";
			}
	}

}
