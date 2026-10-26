-- Separate exercise database; not the retail-store database.
CREATE DATABASE IF NOT EXISTS route_erd;
USE route_erd;
CREATE TABLE Users(id INT PRIMARY KEY AUTO_INCREMENT,email VARCHAR(255) UNIQUE NOT NULL,firstName VARCHAR(100),lastName VARCHAR(100),role VARCHAR(30),password VARCHAR(255));
CREATE TABLE UserPhones(userId INT,phone VARCHAR(30),PRIMARY KEY(userId,phone),FOREIGN KEY(userId) REFERENCES Users(id));
CREATE TABLE Products(id INT PRIMARY KEY AUTO_INCREMENT,name VARCHAR(255),stock INT,price DECIMAL(10,2),isDeleted BOOLEAN DEFAULT FALSE,userId INT,FOREIGN KEY(userId) REFERENCES Users(id));
