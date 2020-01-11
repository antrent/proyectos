package com.pruebatecnica.springboot.web.app;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.User.UserBuilder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.pruebatecnica.springboot.web.app.auth.handler.LoginSussesHandler;
import com.pruebatecnica.springboot.web.app.models.service.JpaUserDetailsService;

@EnableGlobalMethodSecurity(securedEnabled=true)
@Configuration
public class SpringSecurityConfing extends WebSecurityConfigurerAdapter{
		
		@Autowired
		private LoginSussesHandler successHandler;
		
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
		
			build.userDetailsService(userDetailsService).passwordEncoder(passwordEncoder);
		}
}
