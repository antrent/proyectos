package com.vacacionapp.app.models.dao;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vacacionapp.app.models.entity.Departamento;

public interface IDepartamentoDao extends JpaRepository<Departamento, Integer> {

}
