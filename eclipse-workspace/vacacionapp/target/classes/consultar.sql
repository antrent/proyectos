
--consulta para ver solicitudes pendientes
/*
 
select *
from tsolicitud s
where s.est_sol_codigo = 'E'
and S.CODIGO_EMP_SOLICITA in
(select D.EMP_CODIGO
from tdetempleadocargo d
where D.CARGO_CODIGO in (select c.codigo
                         from tcargo c
                        where C.DEPTO_CODIGO in (select D.CODIGO
                                                   from tdepartamento d, tcargo c
                                                  where D.CODIGO = C.DEPTO_CODIGO
                                                    and C.CODIGO = (select D.CARGO_CODIGO
                                                                      from tdetempleadocargo d
                                                                     where D.FECH_FIN is null
                                                                       and D.EMP_CODIGO = '14')
                                                    and C.ES_JEFE = 'S')));*/

CODIGO
ACTIVO
EMAIL
FECH_INGRESO
FECH_NACIMIENTO
FOTO
GENERO
INICIALES
NUM_DOCUMENTO
PASSWORD
PRI_APELLIDO
PRI_NOMBRE
ROL
SEG_APELLIDO
SEG_NOMBRE
TIP_DOCUMENTO
USUARIO

select DC.CODIGO, DC.CARGO_CODIGO, C.DESCRIPCION, DC.EMP_CODIGO, DC.FECH_INGRESO, DC.FECH_FIN from TDETEMPLEADOCARGO DC,TCARGO C WHERE DC.CARGO_CODIGO = C.CODIGO AND DC.EMP_CODIGO = 13

Insert into TFESTIVO (CODIGO,FECHA) values ('10',to_date('01/06/18','DD/MM/RR'));
Insert into TFESTIVO (CODIGO,FECHA) values ('12',to_date('23/06/18','DD/MM/RR'));
Insert into TFESTIVO (CODIGO,FECHA) values ('13',to_date('16/06/18','DD/MM/RR'));
Insert into TFESTIVO (CODIGO,FECHA) values ('14',to_date('10/06/18','DD/MM/RR'));
Insert into TFESTIVO (CODIGO,FECHA) values ('15',to_date('11/10/18','DD/MM/RR'));

select COUNT(0) as cantFestivo from TFESTIVO where to_CHAR(fecha,'DD/MM/YYYY') between TO_DATE(:1,'DD/MM/YYYY') and TO_DATE(:2,'DD/MM/YYYY');



select distinct s.*, d.*
from tsolicitud s, tdetempleadocargo d
where  s.est_sol_codigo = 'E'
and D.CARGO_CODIGO in (select * --c.codigo
                         from tcargo c
                        where C.DEPTO_CODIGO in (select D.CODIGO
                                                   from tdepartamento d, tcargo c
                                                  where D.CODIGO = C.DEPTO_CODIGO
                                                    and C.CODIGO = (select D.CARGO_CODIGO
                                                                      from tdetempleadocargo d
                                                                     where D.FECH_FIN is null
                                                                       and D.EMP_CODIGO = '13')
                                                    and C.ES_JEFE = 'S'));

select *
from tsolicitud s
where s.est_sol_codigo = 'E'
and S.CODIGO_EMP_SOLICITA in
(select D.EMP_CODIGO
from tdetempleadocargo d
where D.CARGO_CODIGO in (select c.codigo
                         from tcargo c
                        where C.DEPTO_CODIGO in (select D.CODIGO
                                                   from tdepartamento d, tcargo c
                                                  where D.CODIGO = C.DEPTO_CODIGO
                                                    and C.CODIGO = (select D.CARGO_CODIGO
                                                                      from tdetempleadocargo d
                                                                     where D.FECH_FIN is null
                                                                       and D.EMP_CODIGO = '13')
                                                    and C.ES_JEFE = 'S')));



select D.CARGO_CODIGO
from tdetempleadocargo d
where D.FECH_FIN is null
and D.EMP_CODIGO = '13'

select *
from tdetempleadocargo d, tdepartamento dp
where D.FECH_FIN is null
and D.CARGO_CODIGO in (select c.codigo
                         from tcargo c
                        where c.es_jefe = 'S');

select *
from tdetempleadocargo d
where D.FECH_FIN is null
and D.CARGO_CODIGO in (select c.codigo
                         from tcargo c
                        where C.DEPTO_CODIGO in (select D.CODIGO
                                                   from tdepartamento d, tcargo c
                                                  where D.CODIGO = C.DEPTO_CODIGO
                                                    and C.ES_JEFE = 'S'));



select * --codigo
from tcargo


select *
from tsolicitud s
where s.est_sol_codigo = 'E';

select *
from tdetempleadocargo;


select s.*, e.PRI_NOMBRE||' '||e.SEG_NOMBRE as nombre
from tsolicitud s,
     templeado e
where s.est_sol_codigo = 'E'
  and s.CODIGO_EMP_SOLICITA = e.CODIGO
  and S.CODIGO_EMP_SOLICITA in (select D.EMP_CODIGO
                                  from tdetempleadocargo d
                                 where D.CARGO_CODIGO in (select c.codigo
                                                            from tcargo c
                                                            where C.DEPTO_CODIGO in (select D.CODIGO
                                                                                       from tdepartamento d, tcargo c
                                                                                      where D.CODIGO = C.DEPTO_CODIGO
                                                                                        and C.CODIGO = (select D.CARGO_CODIGO
                                                                                                          from tdetempleadocargo d
                                                                                                         where D.FECH_FIN is null
                                                                                                           and D.EMP_CODIGO = '13')
                                                                                        and C.ES_JEFE = 'S')));


select s.* from tsolicitud s where s.CODIGO_EMP_SOLICITA = 1? and s.CODIGO = 2?;


--select d.EMP_CODIGO,e.email as emailemp, d.CARGO_CODIGO,c.DESCRIPCION as descargoEmple, j.cod_jefe, j.CARGO_CODIGO as cod_cargojefe, j.DESCRIPCION as descargoJefe, j.email as emailjefe
select e.CODIGO,e.ACTIVO,e.EMAIL,e.FECH_INGRESO,e.FECH_NACIMIENTO,e.FOTO,e.GENERO,e.INICIALES,e.NUM_DOCUMENTO,e.PASSWORD,e.PRI_APELLIDO,e.PRI_NOMBRE,e.ROL,e.SEG_APELLIDO,e.SEG_NOMBRE,e.TIP_DOCUMENTO,e.USUARIO
from 
(select j.*
from tdetempleadocargo d, 
     tcargo c, 
     templeado e,
     (select c.DEPTO_CODIGO, d.cargo_codigo, c.descripcion, e.*
        from tdetempleadocargo d, tcargo c, templeado e
       where d.cargo_codigo = c.codigo
         and d.EMP_CODIGO = e.codigo
         and c.es_jefe = 'S'
         and c.activo = 'S'
         and d.fech_fin is null) j
where d.cargo_codigo = c.codigo
and d.EMP_CODIGO = e.codigo
and d.EMP_CODIGO = 1
and d.fech_fin is null
and c.DEPTO_CODIGO = j.DEPTO_CODIGO) e

select *
  from tdetempleadocargo d, tcargo c
 where d.cargo_codigo = c.codigo
   and c.es_jefe = 'S'
   and c.activo = 'S'
   and d.fech_fin is null;
   
select * 
from templeado
where codigo = 16

desc templeado
   
select *
  from tdetempleadocargo d, tcargo c, templeado e
 where d.cargo_codigo = c.codigo
   and d.EMP_CODIGO = e.codigo
   and c.es_jefe = 'S'
   and c.activo = 'S'
   and d.fech_fin is null