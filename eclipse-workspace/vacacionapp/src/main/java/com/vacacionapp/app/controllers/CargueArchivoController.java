package com.vacacionapp.app.controllers;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.SessionAttributes;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.multipart.MultipartFile;
import com.vacacionapp.app.models.service.IUploadFileService;


@Secured(value= {"ROLE_ADMIN"})
@Controller
@SessionAttributes("cargue")
public class CargueArchivoController {

	@Autowired
	private IUploadFileService uploadFileService;	
	
	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/cargue")
	public String cargue(Map<String, Object> model) {
		model.put("titulo", "Cargue Datos");
		return "/cargue";
	}
	@Secured("ROLE_ADMIN")
	@RequestMapping(value = "/carguearchivo")
	public String cargueArchivo(@RequestParam(name = "tipodato", defaultValue = "") String tipodato,
								@RequestParam(name = "archivo", defaultValue = "") MultipartFile archivo,
								Map<String, Object> model, SessionStatus status) {
		String resultado = null;
		String codErr = null;
		
		if(!archivo.isEmpty()) {
			try {
				String uniqueFilename  = uploadFileService.copy(archivo);
				Path rootPath = uploadFileService.getPath(uniqueFilename);

				resultado = uploadFileService.ImportarArchivo(rootPath.toString(), tipodato);
				
				status.setComplete();
				
			} catch (IOException e) {
				
				e.printStackTrace();
			}
			
		}
		if (resultado != null) {
			codErr = resultado.substring(0,resultado.lastIndexOf("-"));
		}
		if (codErr.equals("01")) {
			model.put("error",resultado.substring(resultado.lastIndexOf("-")+1,resultado.length()));
		}else if (codErr.equals("02")) {
			model.put("success",resultado.substring(resultado.lastIndexOf("-")+1,resultado.length()));
		}else {
			model.put("warning",resultado.substring(resultado.lastIndexOf("-")+1,resultado.length()));
		} 
			
		model.put("titulo", "Cargue Datos");
		return "/cargue";
	
	}	
}


