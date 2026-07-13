package com.vacacionapp.app.models.service;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.UUID;

import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.hssf.usermodel.HSSFDataFormatter;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Row.MissingCellPolicy;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import org.springframework.web.multipart.MultipartFile;

import com.vacacionapp.app.models.entity.Empleado;
import com.vacacionapp.app.models.entity.Festivo;
import com.vacacionapp.app.models.entity.Solicitud;

@Service
public class UploadFileServiceImpl implements IUploadFileService {

	@Autowired
	private IEmpleadoService empleadoService;
	
	@Autowired
	private BCryptPasswordEncoder passwordEncoder;
	
	@Autowired
	private IFestivoService festivoService;
	
	private final Logger log = org.slf4j.LoggerFactory.getLogger(getClass());
	private final static String UPLOADS_FOLDER = "uploads";

	@Override
	public Resource load(String filename) throws MalformedURLException {

		Path pathFoto = getPath(filename);
		log.info("pathFoto: " + pathFoto);
		Resource recurso = null;
		recurso = new UrlResource(pathFoto.toUri());
		if (!recurso.exists() || !recurso.isReadable()) {
			throw new RuntimeException("Error: No se puede cargar la imagen: " + pathFoto.toString());

		}

		return recurso;
	}

	@Override
	public String copy(MultipartFile file) throws IOException {

		String uniqueFilename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();

		Path rootPath = getPath(uniqueFilename);

		log.info("rootPath:  " + rootPath);

		/*
		 * byte[] bytes = foto.getBytes(); Path rutaCompleta = Paths.get(rootPath + "//"
		 * + foto.getOriginalFilename()); Files.write(rutaCompleta, bytes);
		 */
		Files.copy(file.getInputStream(), rootPath);

		return uniqueFilename;
	}

	@Override
	public boolean delete(String filename) {
		
		Path rootPath = getPath(filename);
		File archivo = rootPath.toFile();
		
		if(archivo.exists() && archivo.canRead()) {
			if(archivo.delete()) {
				return true;
			}
		}
		return false;
	}

	public Path getPath(String filename) {
		return Paths.get(UPLOADS_FOLDER).resolve(filename).toAbsolutePath();
	}

	@Override
	public void deleteAll() {
		FileSystemUtils.deleteRecursively(Paths.get(UPLOADS_FOLDER).toFile());
		
	}

	@Override
	public void init() throws IOException {
		Files.createDirectories(Paths.get(UPLOADS_FOLDER));
		
	}
	
	public String ImportarArchivo(String rutaArchivo, String tipoDato) {
		File archivoExcel = new File(rutaArchivo); //ruta del archivo xls o xlsx
		Workbook libroExcel = null;
		String linea = null;
		
		//sacamos la extencion del archivo para validarla
		linea = rutaArchivo.substring(rutaArchivo.lastIndexOf(".") + 1,rutaArchivo.length()).toLowerCase();
		if (!linea.equalsIgnoreCase("xlsx") && !linea.equalsIgnoreCase("xls") ) {
		   return "01-El archivo debe ser de extencion xls o xlsx";
		}
		
		//dejamos la linea nuevamente a null para cargarla con la informacion.
		linea = null;
		
		try {
			libroExcel = WorkbookFactory.create(new FileInputStream(archivoExcel));
			Sheet hojaActual = libroExcel.getSheetAt(0); //acceder a la primera hoja
			DateTimeFormatter formato = DateTimeFormatter.ofPattern("M/d/yy");
			HSSFDataFormatter formatter = new HSSFDataFormatter();
			
			//Recorre las filas de la hoja
			for (Row filaActual : hojaActual) {
				//No cargamos la primera columna del archivo.
				if (tipoDato.equals("EM") && filaActual.getLastCellNum() != 16) {
					return "01-El archivo que intenta importar no cumple el formato de Empleado.";
				}else if(tipoDato.equals("SO") && filaActual.getLastCellNum() != 23) {
					return "01-El archivo que intenta importar no cumple el formato de Solicitud.";
				}else if(tipoDato.equals("FE") && filaActual.getLastCellNum() != 1) {
					return "01-El archivo que intenta importar no cumple el formato de Festivo.";
				}
				if(filaActual.getRowNum() != 0){
					linea = null;
					//Recorremos las celdas 
				    for(int cn=0; cn < filaActual.getLastCellNum(); cn++) {
				    	//tomamos el valor de cada celda si esta no tiene valor asignamos un valor vacio
						Cell cell = filaActual.getCell(cn, MissingCellPolicy.CREATE_NULL_AS_BLANK) ;
						String text = formatter.formatCellValue(cell);//cell.toString();//formatter.formatCellValue(cell);
						
						//System.out.println ("Antonio formatted "+ formatter.formatCellValue(cell));
						
						 	if(linea == null) {
						 		linea = text;
						 	} else {
						 		linea = linea.concat(";").concat(text); 
						 	}
					}
				//System.out.println("Antonio Entre a leer archivo linea "+linea);
				
				/*------------------------------------------------------------*/
			            //Empleado empleado = new Empleado();
			            //Defino cual es el formato en el que viene el dato. 
			           // DateTimeFormatter formato = DateTimeFormatter.ofPattern("dd-MMM-yyyy");
			            String[] parts   	=  linea.split(";");
		            	
			            if (tipoDato.equals("EM")) {
			            	//cargue informacion del empleado
				                String tipoDoc    	=  parts[0];
				                String numeDoc   	=  parts[1];
				                String priNombre 	=  parts[2];
				                String segNombre 	=  parts[3];
				                String priApellido 	=  parts[4];
				                String segApellido 	=  parts[5];
				                //Asigno el formato local para pasar el formato en que viene a Date
				                Date fechNacimiento = java.sql.Date.valueOf(LocalDate.parse(parts[6], formato));
				                String genero 		=  parts[7];
				                String iniciales 	=  parts[8].length() > 0 ? parts[8] : "";
				                if(iniciales.length() == 0) {
				                       iniciales 	=  priNombre.length() > 0 ? priNombre.substring(0,1): segNombre.length() > 0 ? segNombre.substring(0,1) : "";
				                	   iniciales 	=  iniciales.concat(segNombre.length() > 0 ? segNombre.substring(0,1) : "");
				                       iniciales    =  iniciales.concat(priApellido.length() > 0 ? priApellido.substring(0,1) : segApellido.length() > 0 ? segApellido.substring(0,1) : "");
				                       iniciales    =  iniciales.concat(segApellido.length() > 0 ? segApellido.substring(0,1) : "");
				                }
				                Date fechIngreso 	=  java.sql.Date.valueOf(LocalDate.parse(parts[9], formato));
				                String email 		=  parts[10];
				                String foto 		=  parts[11];
				                String usuario 		=  parts[12].length() > 0 ? parts[12] : parts[10].substring(0,parts[10].lastIndexOf("@")); //parts[12];
				                String password 	=  parts[13].length() > 0 ? parts[13] : passwordEncoder.encode(parts[1]);//parts[13];
				                String rol 			=  parts[14];
				                String activo 		=  parts[15];	
		                
		                	Empleado empleado =  new Empleado(tipoDoc, numeDoc, priNombre, segNombre, 
		                									  priApellido, segApellido, fechNacimiento, genero, 
		                									  iniciales, fechIngreso, email, foto, usuario, password, rol, activo);
		                	empleadoService.save(empleado);
		                	
			            }else if(tipoDato.equals("SO"))  {
			            	//cargue informacion del Solicitud
			            	Integer codigoEmpAprueba	= empleadoService.findByNumDocByTipDoc(parts[0], parts[1]);
			            	Integer codigoEmpSolicita   = empleadoService.findByNumDocByTipDoc(parts[2], parts[3]);
			            	String diasDisfrutados	= parts[4];
			            	String diasPorDisfrutar	= parts[5];
			            	String diasTotalGeneral	= parts[6];
			            	String empleadoCodigo	= parts[7];
			            	String diasTotalPeriodo	= parts[8];
			            	String estSolCodigo		= parts[9];
			            	Date fechAprobacion		= java.sql.Date.valueOf(LocalDate.parse(parts[10], formato));
			            	Date fechFin			= java.sql.Date.valueOf(LocalDate.parse(parts[11], formato));
			            	Date fechIni			= java.sql.Date.valueOf(LocalDate.parse(parts[12], formato));
			            	Date fechReingreso		= java.sql.Date.valueOf(LocalDate.parse(parts[13], formato));
			            	Date fechSalida			= java.sql.Date.valueOf(LocalDate.parse(parts[14], formato));
			            	Date fechSolicitud		= java.sql.Date.valueOf(LocalDate.parse(parts[15], formato));
			            	Date fechFinVac			= java.sql.Date.valueOf(LocalDate.parse(parts[16], formato));
			            	String horasTotalSalida	= parts[17];
			            	String observacion		= parts[18];
			            	String tipSolCodigo		= parts[19];
			            	String diasAcomuPendientes= parts[20];
			            	String diasPendientes	= parts[21];
			            	String diasSolicitados	= parts[22];
			            	
			            	Empleado empleado = empleadoService.findById(codigoEmpSolicita); 
			            	
		                	Solicitud solicitud =  new Solicitud(codigoEmpAprueba,codigoEmpSolicita,diasDisfrutados,diasPorDisfrutar,
															     diasTotalGeneral,empleadoCodigo,diasTotalPeriodo,estSolCodigo,
																 fechAprobacion,fechFin,fechIni,fechReingreso,fechSalida,
																 fechSolicitud,horasTotalSalida,observacion,tipSolCodigo,
															     diasAcomuPendientes,diasPendientes,diasSolicitados,fechFinVac, empleado);
		                	empleadoService.saveSolicitud(solicitud);
			            	
			            }else if(tipoDato.equals("FE"))  {
			            	//cargue informacion de Festivos
			            	Date fechFestivo		= java.sql.Date.valueOf(LocalDate.parse(parts[0], formato));

			            	Festivo festivo =  new Festivo(fechFestivo);
			            	festivoService.save(festivo);			            	
			            	
			            }else {
			            	return "01-Seleccione un tipo de dato Adecuado, No se han importado datos.";
			            }
				 /*------------------------------------------------------------*/
				
				}
			}
			
			return "02-Datos Importados con exito.";
			
		} catch (EncryptedDocumentException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (InvalidFormatException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (FileNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (Exception e) {
			e.printStackTrace();	
		}//crear un libro excel
		return "03-Validar Importacion posible error no controlado, en com.vacacionapp.app.models.service.UploadFileServiceImpl.ImportarArchivo";
		
	}
}
