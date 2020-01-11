package com.vacacionapp.app;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
//import org.springframework.security.core.userdetails.User;
//import org.springframework.security.core.userdetails.User.UserBuilder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
//import org.springframework.security.crypto.factory.PasswordEncoderFactories;
//import org.springframework.security.crypto.password.PasswordEncoder;

import com.vacacionapp.app.auth.handler.LoginSussesHandler;
import com.vacacionapp.app.models.service.JpaUserDetailsService;

@EnableGlobalMethodSecurity(securedEnabled=true)
@Configuration
public class SpringSecurityConfing extends WebSecurityConfigurerAdapter{
		
		@Autowired
		private LoginSussesHandler successHandler;
		
		/* para uso con JDBC
		@Autowired
		DataSource dataSource;
		*/
		
		@Autowired
		private JpaUserDetailsService userDetailsService; 
		
		@Autowired 
		private BCryptPasswordEncoder passwordEncoder;
		
		@Override
		protected void configure(HttpSecurity http) throws Exception {

			http.authorizeRequests().antMatchers("/","/css/**","/js/**","/images/**","/ayuda/**").permitAll()
									/*.antMatchers("/form/**").hasAnyRole("ADMIN")
									.antMatchers("/eliminar/**").hasAnyRole("ADMIN")
									.antMatchers("/listar/**").hasAnyRole("ADMIN")
									.antMatchers("/ver/**").hasAnyRole("USEREMP")
									.antMatchers("/uploads/**").hasAnyRole("USEREMP")*/
									.anyRequest().authenticated()
									.and()
										.formLogin()
										.successHandler(successHandler)
										.loginPage("/login")
										.permitAll()
									.and()
									.logout().permitAll()
									.and()
									.exceptionHandling().accessDeniedPage("/error_403");
		}

		@Autowired
		public void configurerGlobal(AuthenticationManagerBuilder build) throws Exception {
		
			build.userDetailsService(userDetailsService)
			 .passwordEncoder(passwordEncoder);
			
			/*//configuracion con JDBC
			 * build.jdbcAuthentication()
				 .dataSource(dataSource)
				 .passwordEncoder(passwordEncoder)
				 .usersByUsernameQuery("select usuario, password, activo from templeado where usuario = ?")
				 .authoritiesByUsernameQuery("select e.usuario, r.rol_codigo from templeadorole r inner join templeado e on (r.empleado_codigo = e.codigo) where e.usuario = ?");

			*/
			/*//configuracion con la memoria
			PasswordEncoder encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
			UserBuilder users = User.builder().passwordEncoder(encoder::encode);
			build.inMemoryAuthentication()
				.withUser(users.username("admin").password("12345").roles("ADMIN","USER","USEREMP"))
				.withUser(users.username("antonio").password("12345").roles("USEREMP"))
				.withUser(users.username("andres").password("12345").roles("USER"));*/
			
		}
}
