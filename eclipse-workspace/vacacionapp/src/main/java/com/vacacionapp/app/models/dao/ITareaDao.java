package com.vacacionapp.app.models.dao;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vacacionapp.app.models.entity.Tarea;

public interface ITareaDao extends JpaRepository<Tarea, Integer> {

}
