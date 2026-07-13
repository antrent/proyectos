package com.vacacionapp.app.view.xlsx;

import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.view.document.AbstractXlsxView;

import com.vacacionapp.app.models.entity.Solicitud;
import com.vacacionapp.app.util.lisval.TipoEstadoSolicitudEnum;

@Component("solicitud/listarsolicitud")
public class SolicitudXlsxView extends AbstractXlsxView{

	@Override
	protected void buildExcelDocument(Map<String, Object> model, Workbook workbook, HttpServletRequest request, 
			HttpServletResponse response) throws Exception {
		
		response.setHeader("Content-Disposition", "attachment; filename=\"ExportSolicitudes.xlsx\"");
		@SuppressWarnings("unchecked")
		List<Solicitud> solicitud = (List<Solicitud>) model.get("solicitudes");
		Sheet sheet = workbook.createSheet("Solicitudes Realizadas Aprobadas");
		
		Font monthFont = workbook.createFont();
        monthFont.setFontHeightInPoints((short)12);
        monthFont.setColor(IndexedColors.BLACK.index);
        monthFont.setBold(true);
		
		CellStyle theaderStyle = workbook.createCellStyle();
		theaderStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.index);
		theaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
		theaderStyle.setFont(monthFont);
				
		Row header = sheet.createRow(0);
		header.createCell(0).setCellValue("Nombre Empleado");
		header.createCell(1).setCellValue("Fecha Solicitud");
		header.createCell(2).setCellValue("Estado");
		header.createCell(3).setCellValue("Periodo Inicio");
		header.createCell(4).setCellValue("Periodo Fin");
		header.createCell(5).setCellValue("Fecha Salida");
		header.createCell(6).setCellValue("Fecha Fin");
		header.createCell(7).setCellValue("Fecha Inicio Labores");
		header.createCell(8).setCellValue("Dias Solicitados");
		header.createCell(9).setCellValue("Dias Disfrutados");
		header.createCell(10).setCellValue("Dias Acomulados Pendientes");
		header.createCell(11).setCellValue("Dias Total General");
		
		header.getCell(0).setCellStyle(theaderStyle);
		header.getCell(1).setCellStyle(theaderStyle);
		header.getCell(2).setCellStyle(theaderStyle);
		header.getCell(3).setCellStyle(theaderStyle);
		header.getCell(4).setCellStyle(theaderStyle);
		header.getCell(5).setCellStyle(theaderStyle);
		header.getCell(6).setCellStyle(theaderStyle);
		header.getCell(7).setCellStyle(theaderStyle);
		header.getCell(8).setCellStyle(theaderStyle);
		header.getCell(9).setCellStyle(theaderStyle);
		header.getCell(10).setCellStyle(theaderStyle);
		header.getCell(11).setCellStyle(theaderStyle);
		
		
		int rownum = 1;
		for(Solicitud sol: solicitud) {
			//if (sol.getEstSolCodigo().equals("A")) {
				Row fila = sheet.createRow(rownum++);
				fila.createCell(0).setCellValue(sol.getEmpleado().getDocNombre());
				fila.createCell(1).setCellValue(sol.getFechSolicitud().toString());
				fila.createCell(2).setCellValue(TipoEstadoSolicitudEnum.valueOf(sol.getEstSolCodigo()).getTipoEstadoSolicitud()); 
				fila.createCell(3).setCellValue(sol.getFechIni().toString());
				fila.createCell(4).setCellValue(sol.getFechFin().toString());
				fila.createCell(5).setCellValue(sol.getFechSalida().toString());
				fila.createCell(6).setCellValue(sol.getFechReingreso().toString());
				fila.createCell(7).setCellValue(sol.getFechFinVac());
				fila.createCell(8).setCellValue(sol.getDiasSolicitados());
				fila.createCell(9).setCellValue(sol.getDiasDisfrutados());
				fila.createCell(10).setCellValue(sol.getDiasAcomuPendientes());
				fila.createCell(11).setCellValue(sol.getDiasTotalGeneral());
			//}
		}
		
		
		
		
		
		
	}

}
