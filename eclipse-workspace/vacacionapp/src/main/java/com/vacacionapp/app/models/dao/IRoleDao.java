package com.vacacionapp.app.models.dao;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vacacionapp.app.models.entity.Role;

public interface IRoleDao extends JpaRepository<Role, Integer> {

}
