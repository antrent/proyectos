package com.vacacionapp.app.view.pdf;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.Comparator;
import java.util.Date;
import java.util.Map;
import java.util.Optional;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.view.document.AbstractPdfView;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.vacacionapp.app.models.entity.Cargo;
import com.vacacionapp.app.models.entity.Departamento;
import com.vacacionapp.app.models.entity.Empleado;
import com.vacacionapp.app.models.entity.Solicitud;
import com.vacacionapp.app.models.service.ICargoService;
import com.vacacionapp.app.models.service.IDepartamentoService;
import com.vacacionapp.app.models.service.IEmpleadoService;
import com.vacacionapp.app.util.mail.EnvioMail;

@Component("ver")
public class SolicitudPdfView extends AbstractPdfView {
	
	@Autowired
	private IEmpleadoService empleadoService;
	
	
	@Autowired
	private ICargoService cargoService;	
	
	@Autowired
	private IDepartamentoService departamentoService;	
	
	@Override
	protected void buildPdfDocument(Map<String, Object> model, Document document, PdfWriter writer,
			HttpServletRequest request, HttpServletResponse response) throws Exception {
		
		ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
		EnvioMail envioMail = new EnvioMail();
		Empleado empleado = (Empleado) model.get("empleado");
		Cargo cargo = new Cargo();
		Departamento departamento = new Departamento();
		
		if (empleado != null && cargoService.findByEmpCod(empleado.getCodigo()) != null) {
			
			cargo = cargoService.findByEmpCod(empleado.getCodigo());

			if (departamentoService.findById(empleado.getCodigo()) != null) {
				departamento = departamentoService.findById(cargo.getDeptoCodigo());
			}
		}
		
		String emailEmpleado = empleado.getEmail();
		String emailEmpleadoJefe = null;
		
		if (empleadoService.findJefeByCodEmp(empleado.getCodigo()) != null) {
			Empleado empleadoJefe = (Empleado)empleadoService.findJefeByCodEmp(empleado.getCodigo());
			emailEmpleadoJefe = empleadoJefe.getEmail();
		}
		
		PdfPCell cell = null;

		PdfPTable tablaEspacio = new PdfPTable(1);
		tablaEspacio.setSpacingAfter(40);
		
		cell = new PdfPCell(new Phrase(""));
		cell.setBorder(Rectangle.NO_BORDER);
		tablaEspacio.addCell(cell);
		
		
		PdfPTable tablaEncabezado = new PdfPTable(1);
		tablaEncabezado.setSpacingAfter(2);	

		cell = new PdfPCell(new Phrase("SOLICITUD DE VACACIONES", FontFactory.getFont(FontFactory.TIMES_ROMAN, 20)));
		cell.setBackgroundColor(new Color(184,218, 255));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		cell.setPadding(30f);
		tablaEncabezado.addCell(cell);		
		
		
		PdfPTable tablaDatEmpleado = new PdfPTable(2);
		tablaDatEmpleado.setSpacingAfter(2);
		tablaDatEmpleado.setWidths(new int[]{3, 7});
		
		cell = new PdfPCell(new Phrase("Datos del Empleado", FontFactory.getFont(FontFactory.TIMES_ROMAN, 15)));
		cell.setBackgroundColor(new Color(34, 139, 255));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		cell.setPadding(8f);
		cell.setColspan(2);
		tablaDatEmpleado.addCell(cell);	
        
		tablaDatEmpleado.addCell("Tipo Documento");
		tablaDatEmpleado.addCell(empleado.getTipDocumento());
		tablaDatEmpleado.addCell("Documento");
		tablaDatEmpleado.addCell(empleado.getNumDocumento());
		tablaDatEmpleado.addCell("Nombre");
		tablaDatEmpleado.addCell(empleado.getPriNombre()+" "+empleado.getSegNombre()+" "+empleado.getPriApellido()+" "+empleado.getSegApellido());
		tablaDatEmpleado.addCell("Código");
		tablaDatEmpleado.addCell(empleado.getIniciales());
		tablaDatEmpleado.addCell("Cargo");
		tablaDatEmpleado.addCell(cargo.getDescripcion());
		tablaDatEmpleado.addCell("Email");
		tablaDatEmpleado.addCell(empleado.getEmail());
		tablaDatEmpleado.addCell("Departamento");
		tablaDatEmpleado.addCell(departamento.getDescripcion());
		tablaDatEmpleado.addCell("Fecha Ingreso");
		tablaDatEmpleado.addCell(empleado.getFechIngreso().toString());
		
		PdfPTable tablaDatDetalleDiasVacaciones = new PdfPTable(2);
		tablaDatDetalleDiasVacaciones.setSpacingAfter(2);
		tablaDatDetalleDiasVacaciones.setWidths(new int[]{7, 2});

        
		cell = new PdfPCell(new Phrase("Control días de Vacaciones",FontFactory.getFont(FontFactory.TIMES_ROMAN, 15)));
		cell.setBackgroundColor(new Color(195,230, 203));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		cell.setPadding(8f);
		cell.setColspan(2);
		
		
		
		/*consultamos la ultima solicitud realizada*/
		int codSolicitud = empleado.getSolicitudes()
									.stream()
									.filter(e -> e.getEstSolCodigo().equals("E"))
									.max(Comparator.comparing(Solicitud::getFechSolicitud))
									.get().getCodigo();
		
		Optional<Solicitud> optSolicitud= empleado.getSolicitudes().stream()
																   .filter(e -> e.getCodigo() == codSolicitud)
																   .findFirst(); 
												//al encontrar el primero, se detiene la iteración del stream y devuelve un Optional
												//evaluamos si el optional posee datos
												//si no posee datos, entonces devolvemos null (lo clásico)
												//la idea de usar Optional es no devolver null y evitar
												//el clásico (if var == null)
												//considera que Optional#get lanza una excepción en caso que
												//no se haya encontrado un resultado
		Solicitud solicitud =  optSolicitud.isPresent() ? optSolicitud.get() : null;
		
		//Solicitud solicitud = (Solicitud) empleado.getSolicitudes().stream().filter(e -> e.getCodigo() == codSolicitud).collect(Collectors.toList()).get(0);
		
		
		System.out.println("Antonio "+solicitud.getDiasTotalGeneral());
		
		/*Dias vacaciones a fecha de hoy*/
		int diasVacaAHoy = empleado.getSolicitudes()
									.stream()
									.filter(e -> e.getCodigo() == codSolicitud ).findFirst().get().getDiasTotalGeneral();
		
		/*Dias Disfrutados y pagados a fecha de Hoy */
		int diasDisfruAHoy = empleado.getSolicitudes()
									.stream()
									.filter(e -> e.getCodigo() == codSolicitud).findFirst().get().getDiasDisfrutados();

		/*Total Días de Vacaciones por Disfrutar*/
		int diasDisfruPorDisfru = empleado.getSolicitudes()
									.stream()
									.filter(e -> e.getCodigo() == codSolicitud).findFirst().get().getDiasAcomuPendientes();		

		/*Días hábiles tomados con ésta solicitud*/
		int diasSolicitados = empleado.getSolicitudes()
										.stream()
										.filter(e -> e.getCodigo() == codSolicitud).findFirst().get().getDiasSolicitados();
		
		/*Días hábiles tomados con ésta solicitud*/
		int diasPorDisfrutar = empleado.getSolicitudes()
										.stream()
										.filter(e -> e.getCodigo() == codSolicitud).findFirst().get().getDiasPorDisfrutar();
		
		tablaDatDetalleDiasVacaciones.addCell(cell);
		tablaDatDetalleDiasVacaciones.addCell("Dias de Vacaciones a fecha de Hoy");
		cell = new PdfPCell(new Phrase(String.valueOf(diasVacaAHoy)));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		tablaDatDetalleDiasVacaciones.addCell(cell);		
		tablaDatDetalleDiasVacaciones.addCell("Dias Disfrutados y pagados a fecha de Hoy");
		cell = new PdfPCell(new Phrase(String.valueOf(diasDisfruAHoy)));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		tablaDatDetalleDiasVacaciones.addCell(cell);
		tablaDatDetalleDiasVacaciones.addCell("Total Días de Vacaciones por Disfrutar");
		cell = new PdfPCell(new Phrase(String.valueOf(diasDisfruPorDisfru)));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		tablaDatDetalleDiasVacaciones.addCell(cell);
		tablaDatDetalleDiasVacaciones.addCell("Días hábiles tomados con ésta solicitud");
		cell = new PdfPCell(new Phrase(String.valueOf(diasSolicitados)));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		tablaDatDetalleDiasVacaciones.addCell(cell);		
		tablaDatDetalleDiasVacaciones.addCell("Nuevo saldo de días por Disfrutar");
		cell = new PdfPCell(new Phrase(String.valueOf(diasPorDisfrutar))); 
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		tablaDatDetalleDiasVacaciones.addCell(cell);				
		
		
		PdfPTable tablaDatSolicitud = new PdfPTable(3);
		tablaDatSolicitud.setSpacingAfter(2);
		tablaDatSolicitud.setWidths(new int[]{4,2,2});
		
		cell = new PdfPCell(new Phrase("Detalle días a Solicitar",FontFactory.getFont(FontFactory.TIMES_ROMAN, 15)));
		cell.setBackgroundColor(new Color(195,230, 203));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		cell.setPadding(8f);
		cell.setColspan(3);
		
		tablaDatSolicitud.addCell(cell);
		
		cell = new PdfPCell(new Phrase("Período a Disfrutar"));
		cell.setVerticalAlignment(Element.ALIGN_CENTER);
		cell.setPadding(8f);
		cell.setRowspan(2);
		tablaDatSolicitud.addCell(cell);

		cell = new PdfPCell(new Phrase("Del Año"));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		tablaDatSolicitud.addCell(cell);
		
		cell = new PdfPCell(new Phrase("Al Año"));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);		
		tablaDatSolicitud.addCell(cell);
		
		/*Período a Disfrutar:*/
		/*Del Año*/
		 Date fechInicio = empleado.getSolicitudes()
											.stream()
											.filter(e -> e.getCodigo() == codSolicitud).findFirst().get().getFechIni();
		/*Período a Disfrutar:*/
		/*Del Año*/		
		 Date fechFin = empleado.getSolicitudes()
											.stream()
											.filter(e -> e.getCodigo() == codSolicitud).findFirst().get().getFechFin();		 
		/*Fecha Inicio Vacaciones*/
		 Date fechIniVac = empleado.getSolicitudes()
								.stream()
								.filter(e -> e.getCodigo() == codSolicitud).findFirst().get().getFechSalida();
		 
		/*Fecha que Finaliza las Vacaciones*/
		 Date fechFinVac = empleado.getSolicitudes()
								.stream()
								.filter(e -> e.getCodigo() == codSolicitud).findFirst().get().getFechFinVac();
		 
		/*Fecha que reingreso de las Vacaciones*/
		 Date fechReiVac = empleado.getSolicitudes()
								.stream()
								.filter(e -> e.getCodigo() == codSolicitud).findFirst().get().getFechReingreso();		 
		 
		cell = new PdfPCell(new Phrase(String.valueOf(fechInicio)));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		tablaDatSolicitud.addCell(cell);
		
		cell = new PdfPCell(new Phrase(String.valueOf(fechFin)));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);		
		tablaDatSolicitud.addCell(cell);		
		
		tablaDatSolicitud.addCell("Fecha Inicio Vacaciones");
		cell = new PdfPCell(new Phrase(String.valueOf(fechIniVac)));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);		
		tablaDatSolicitud.addCell(cell);
		tablaDatSolicitud.addCell("");		
		
		tablaDatSolicitud.addCell("Fecha que Finaliza las Vacaciones");
		cell = new PdfPCell(new Phrase(String.valueOf(fechFinVac)));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);		
		tablaDatSolicitud.addCell(cell);
		tablaDatSolicitud.addCell("");
		
		tablaDatSolicitud.addCell("Fecha de Inicio de Labores");
		cell = new PdfPCell(new Phrase(String.valueOf(fechReiVac)));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);				
		tablaDatSolicitud.addCell(cell);
		tablaDatSolicitud.addCell("");		
		
		

		 String Observacion = empleado.getSolicitudes()
								.stream()
								.filter(e -> e.getCodigo() == codSolicitud).findFirst().get().getObservacion();		

		PdfPTable tablaDatObservacion = new PdfPTable(1);
		tablaDatObservacion.setSpacingAfter(2);
		
		cell = new PdfPCell(new Phrase("Observaciones",FontFactory.getFont(FontFactory.TIMES_ROMAN, 15)));
		cell.setBackgroundColor(new Color(195,230, 203));
		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		cell.setPadding(8f);
		
		tablaDatObservacion.addCell(cell);
		tablaDatObservacion.addCell(Observacion);
		
		
		/*
		tablaDatSolicitud.addCell("Solicitud: "+empleado.getSolicitudes().stream().mapToInt(i -> i.getCodigo()).max().getAsInt());
		tablaDatSolicitud.addCell("Fecha Solicitud: "+empleado.getSolicitudes().stream().max(Comparator.comparing(Solicitud::getFechSolicitud)).get().getFechSolicitud());
		tablaDatSolicitud.addCell("Dias Solcitados: "+empleado.getSolicitudes().stream().mapToInt(i -> i.getDiasSolicitados()).max().getAsInt());
		tablaDatSolicitud.addCell("Dias Difrutados: "+empleado.getSolicitudes().stream().mapToInt(i -> i.getDiasDisfrutados()).max().getAsInt());
		tablaDatSolicitud.addCell("Dias Total General: "+empleado.getSolicitudes().stream().mapToInt(i -> i.getDiasTotalGeneral()).max().getAsInt());
		*/
		
		PdfWriter.getInstance(document, outputStream);
		
			document.open();
			
				document.add(tablaEspacio);	
				document.add(tablaEncabezado);
				document.add(tablaDatEmpleado);
				document.add(tablaDatDetalleDiasVacaciones);
				document.add(tablaDatSolicitud);
				document.add(tablaDatObservacion);
			document.close();

	    envioMail.SendMailPdf(outputStream, emailEmpleado, emailEmpleadoJefe,"SOLICITUD DE VACACIONES","Con el presente se desea solicitar el periodo de vacaciones adjunto.");
				
	}
}
