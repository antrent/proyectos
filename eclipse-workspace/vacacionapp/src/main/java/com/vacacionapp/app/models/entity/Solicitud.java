package com.vacacionapp.app.models.entity;

import java.io.Serializable;
import java.util.Calendar;
import java.util.Comparator;
import java.util.Date;
import java.util.OptionalInt;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;

import org.springframework.format.annotation.DateTimeFormat;


@Entity
@Table(name="tsolicitud")
public class Solicitud implements Serializable {

	
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)//GenerationType.
	private int codigo; 
	
	@Column(name="fech_solicitud")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	//@DateTimeFormat(pattern = "dd/MM/yyyy")
	private Date fechSolicitud;
	
	@Column(name="tip_sol_codigo")
	private int tipSolCodigo;
	
	@Column(name="est_sol_codigo")
	private String estSolCodigo;
	
	private String observacion;
	
	@Column(name="codigo_emp_solicita")
	private int codigoEmpSolicita;
	
	@Column(name="dias_disfrutados")
	private int diasDisfrutados;
	
	@Column(name="dias_por_disfrutar")
	private int diasPorDisfrutar;
	
	@Column(name="dias_total_general")
	private int diasTotalGeneral;
	
	@Column(name="dias_total_periodo")
	private int diasTotalPeriodo; 
	
	@Column(name="fech_ini")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	//@DateTimeFormat(pattern = "dd/MM/yyyy")
	private Date fechIni;
	
	@Column(name="fech_fin")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	//@DateTimeFormat(pattern = "dd/MM/yyyy")
	private Date fechFin;
	
	@Column(name="fech_salida")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	//@DateTimeFormat(pattern = "dd/MM/yyyy")
	private Date fechSalida;
	
	@Column(name="fech_fin_vac")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	//@DateTimeFormat(pattern = "dd/MM/yyyy")
	private Date fechFinVac;	
	
	@Column(name="fech_reingreso")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	//@DateTimeFormat(pattern = "dd/MM/yyyy")
	private Date fechReingreso;
	
	@Column(name="horas_total_salida")
	private int horasTotalSalida = 0;
	
	@Column(name="codigo_emp_aprueba")	
	private int codigoEmpAprueba;
	
	@Column(name="fech_aprobacion")
	@Temporal(TemporalType.DATE)
	@DateTimeFormat(pattern="yyyy-MM-dd")
	//@DateTimeFormat(pattern = "dd/MM/yyyy")
	private Date fechAprobacion;
	
	@Column(name="dias_acomu_pendientes")
	private int diasAcomuPendientes;
	
	@Column(name="dias_pendientes")
	private int diasPendientes;
	
	@Column(name="dias_solicitados")
	private int diasSolicitados;
	
	/*-tener cuidado con esta relacion- INICIO*/
	@ManyToOne(fetch=FetchType.LAZY)
	private Empleado empleado;
	/*-tener cuidado con esta relacion- FIN*/
	
	public Solicitud() {}	
	
	public Solicitud(Integer codigoEmpAprueba,Integer codigoEmpSolicita,String diasDisfrutados,String diasPorDisfrutar,
					 String diasTotalGeneral,String empleadoCodigo,String diasTotalPeriodo,String estSolCodigo,
					   Date fechAprobacion,Date fechFin,Date fechIni,Date fechReingreso,Date fechSalida,
					   Date fechSolicitud,String horasTotalSalida,String observacion,String tipSolCodigo,
					   String diasAcomuPendientes,String diasPendientes,String diasSolicitados,Date fechFinVac, Empleado empleado) {
				
				this.codigoEmpAprueba = codigoEmpAprueba;
				this.codigoEmpSolicita = codigoEmpSolicita;
				this.diasDisfrutados = Integer.parseInt(diasDisfrutados);
				this.diasPorDisfrutar = Integer.parseInt(diasPorDisfrutar);
				this.diasTotalGeneral = Integer.parseInt(diasTotalGeneral);
				//this.empleadoCodigo = empleadoCodigo;
				this.diasTotalPeriodo = Integer.parseInt(diasTotalPeriodo);
				this.estSolCodigo = estSolCodigo;
				this.fechAprobacion = fechAprobacion;
				this.fechFin = fechFin;
				this.fechIni = fechIni;
				this.fechReingreso = fechReingreso;
				this.fechSalida = fechSalida;
				this.fechSolicitud = fechSolicitud;
				this.horasTotalSalida = Integer.parseInt(horasTotalSalida);
				this.observacion = observacion;
				this.tipSolCodigo = Integer.parseInt(tipSolCodigo);
				this.diasAcomuPendientes = Integer.parseInt(diasAcomuPendientes);
				this.diasPendientes = Integer.parseInt(diasPendientes);
				this.diasSolicitados = Integer.parseInt(diasSolicitados);
				this.fechFinVac = fechFinVac;
				
				this.setEmpleado(empleado);
				
	}	
	
	public void calcularDias() {
		//Formato de la fecha
		//SimpleDateFormat formatter = new SimpleDateFormat("dd/MM/yyyy");
		//SimpleDateFormat formatterAnio = new SimpleDateFormat("yyyy");
		Date fechaHoy = new Date();
		Calendar calendario = Calendar.getInstance(); 
		
		codigoEmpSolicita = empleado.getCodigo();
		
		long diferenciaEn_ms = fechaHoy.getTime() - empleado.getFechIngreso().getTime();
		Double dias = (double) (diferenciaEn_ms / (1000 * 60 * 60 * 24));
		
		//Calculo de dias de vacaciones hasta el dia de hoy
		fechSolicitud = fechaHoy ;//new Date();
		diasTotalGeneral = (((int)(dias / 365)) * 15) + (int)Math.round(((dias % 365) * 15)/365);
		 
		//incremento un año al año de ingreso
		calendario.setTime(empleado.getFechIngreso());
		calendario.add(Calendar.YEAR, 1);

		//Calculo de dias de vacaciones disfrutados
		OptionalInt solicitud = empleado.getSolicitudes()
				.stream()
				.filter(e -> e.estSolCodigo.equals("A"))
				.mapToInt(i -> i.codigo)
				.max();
		
		if (empleado.getSolicitudes().size() > 0 && solicitud.isPresent()) {
			
							  //diferencia en milisegundo en el periodo de inicio a hoy
			diferenciaEn_ms = (fechaHoy.getTime() -  empleado.getSolicitudes()
																.stream()
																.filter(e -> e.getCodigo() == solicitud.getAsInt()/*empleado.getSolicitudes()
																										.stream()
																										.mapToInt(i -> i.codigo)
																										.max().getAsInt() */
																		).findFirst().get().fechIni.getTime());
				   //Dias del desde el periodo de inicio a hoy
			dias = (double) (diferenciaEn_ms / (1000 * 60 * 60 * 24));
								//Dias del periodo a la fecha actual
			diasTotalPeriodo = (((int)(dias / 365)) * 15) + (int)Math.round(((dias % 365) * 15)/365) 
									//dias consumidos del periodo.	
									- (empleado.getSolicitudes()
												.stream()
												.filter(e -> e.estSolCodigo.equals("A"))
												.filter(e -> e.getFechIni().equals(empleado.getSolicitudes()
																							.stream()
																							.max(Comparator.comparing(Solicitud::getFechIni))
																							.get().fechIni)
														).mapToInt(i -> i.diasTotalPeriodo).sum());
			
			diasDisfrutados = empleado.getSolicitudes().stream()
															.filter(e -> e.estSolCodigo.equals("A"))
															.mapToInt(i -> i.diasSolicitados).sum();
			/*diasDisfrutados = empleado.getSolicitudes()
										.stream()
										.filter(d -> d.estSolCodigo.equals("A"))
										.mapToInt(i -> i.diasSolicitados).sum();*/
			
			diasAcomuPendientes = empleado.getSolicitudes().stream()
																	.filter(e -> e.estSolCodigo.equals("A"))
																	.mapToInt(i -> i.diasPendientes).sum(); 
			
		}else {
			if (fechIni != null) {
				diferenciaEn_ms = (fechaHoy.getTime() -  fechIni.getTime());
				
				//Dias del desde el periodo de inicio a hoy
				dias = (double) (diferenciaEn_ms / (1000 * 60 * 60 * 24));
				
				//Dias del periodo a la fecha actual
				diasTotalPeriodo = (((int)(dias / 365)) * 15) + (int)Math.round(((dias % 365) * 15)/365) - 0; 
				
				//dias consumidos del periodo.	
				if (diasTotalPeriodo > 15) {
					diasTotalPeriodo = 15;
				}
				diasDisfrutados = 0;//empleado.getSolicitudes().stream().mapToInt(i -> i.diasSolicitados).sum();
				
				diasAcomuPendientes = 0;//empleado.getSolicitudes().stream().mapToInt(i -> i.diasPendientes).sum();
	}
		}
		
		
		  diasPendientes = diasTotalPeriodo - diasSolicitados;
		  diasAcomuPendientes = diasAcomuPendientes + diasPendientes;
		  diasDisfrutados = diasDisfrutados + diasSolicitados;

		  //Calculo de dias de vacaciones por disfrutar
		  diasPorDisfrutar = diasTotalGeneral - diasDisfrutados;
		
		//anioInicio = Integer.parseInt(formatterAnio.format(empleado.getFechIngreso()));
		//anioActual = Integer.parseInt(formatterAnio.format(fechaHoy));
		
		if (fechFin == null) {
			fechFin = calendario.getTime();
		}
		
		/*System.out.println("Feha Ingreso: " + formatter.format( empleado.getFechIngreso()));
		System.out.println("Feha Actual: " +  formatter.format(fechaHoy));
		System.out.println("Feha fechIni: " + fechIni);
		System.out.println("Feha fechFin: " + fechFin);
		*/
		//System.out.println("Máximo: " +  empleado.getSolicitudes().stream().mapToInt(i -> i.diasDisfrutados).max().getAsInt());
	}
	
	public void prePersist() {
		fechSolicitud = new Date();
		fechAprobacion = new Date();
	}
	
	public int getCodigo() {
		return codigo;
	}
	public void setCodigo(int codigo) {
		this.codigo = codigo;
	}
	public Date getFechSolicitud() {
		return fechSolicitud;
	}
	public void setFechSolicitud(Date fechSolicitud) {
		this.fechSolicitud = fechSolicitud;
	}
	public int getTipSolCodigo() {
		return tipSolCodigo;
	}
	public void setTipSolCodigo(int tipSolCodigo) {
		this.tipSolCodigo = tipSolCodigo;
	}
	public String getEstSolCodigo() {
		return estSolCodigo;
	}
	public void setEstSolCodigo(String estSolCodigo) {
		this.estSolCodigo = estSolCodigo;
	}
	public String getObservacion() {
		return observacion;
	}
	public void setObservacion(String observacion) {
		this.observacion = observacion;
	}
	public int getCodigoEmpSolicita() {
		return codigoEmpSolicita;
	}
	public void setCodigoEmpSolicita(int codigoEmpSolicita) {
		this.codigoEmpSolicita = codigoEmpSolicita;
	}
	public int getDiasDisfrutados() {
		return diasDisfrutados;
	}
	public void setDiasDisfrutados(int diasDisfrutados) {
		this.diasDisfrutados = diasDisfrutados;
	}
	public int getDiasPorDisfrutar() {
		return diasPorDisfrutar;
	}
	public void setDiasPorDisfrutar(int diasPorDisfrutar) {
		this.diasPorDisfrutar = diasPorDisfrutar;
	}
	public int getDiasTotalGeneral() {
		return diasTotalGeneral;
	}
	public void setDiasTotalGeneral(int diasTotalGeneral) {
		this.diasTotalGeneral = diasTotalGeneral;
	}
	public int getDiasGotalPeriodo() {
		return diasTotalPeriodo;
	}
	public void setDiasTotalPeriodo(int diasTotalPeriodo) {
		this.diasTotalPeriodo = diasTotalPeriodo;
	}
	public Date getFechIni() {
		return fechIni;
	}
	public void setFechIni(Date fechIni) {
		this.fechIni = fechIni;
	}
	public Date getFechFin() {
		return fechFin;
	}
	public void setFechFin(Date fechFin) {
		this.fechFin = fechFin;
	}
	public Date getFechSalida() {
		return fechSalida;
	}
	public void setFechSalida(Date fechSalida) {
		this.fechSalida = fechSalida;
	}
	public Date getFechReingreso() {
		return fechReingreso;
	}
	public void setFechReingreso(Date fechReingreso) {
		this.fechReingreso = fechReingreso;
	}
	public int getHorasTotalSalida() {
		return horasTotalSalida;
	}
	public void setHorasTotalSalida(int horasTotalSalida) {
		this.horasTotalSalida = horasTotalSalida;
	}
	public int getCodigoEmpAprueba() {
		return codigoEmpAprueba;
	}
	public void setCodigoEmpAprueba(int codigoEmpAprueba) {
		this.codigoEmpAprueba = codigoEmpAprueba;
	}
	public Date getFechAprobacion() {
		return fechAprobacion;
	}
	public void setFechAprobacion(Date fechAprobacion) {
		this.fechAprobacion = fechAprobacion;
	}
	
	public int getDiasAcomuPendientes() {
		return diasAcomuPendientes;
	}

	public void setDiasAcomuPendientes(int diasAcomuPendientes) {
		this.diasAcomuPendientes = diasAcomuPendientes;
	}

	public int getDiasPendientes() {
		return diasPendientes;
	}

	public void setDiasPendientes(int diasPendientes) {
		this.diasPendientes = diasPendientes;
	}
	
	/*-tener cuidado con esta relacion- INICIO*/
	
	public int getDiasSolicitados() {
		return diasSolicitados;
	}

	public void setDiasSolicitados(int diasSolicitados) {
		this.diasSolicitados = diasSolicitados;
	}

	public Empleado getEmpleado() {
		return empleado;
	}
	public void setEmpleado(Empleado empleado) {
		this.empleado = empleado;
		//calcularDias();
	} 
	/*-tener cuidado con esta relacion FIN*/
	
	public int getDiasTotalPeriodo() {
		return diasTotalPeriodo;
	}

	public Date getFechFinVac() {
		return fechFinVac;
	}

	public void setFechFinVac(Date fechFinVac) {
		this.fechFinVac = fechFinVac;
	}

	private static final long serialVersionUID = 1L;

}