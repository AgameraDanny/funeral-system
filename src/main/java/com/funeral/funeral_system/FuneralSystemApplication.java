package com.funeral.funeral_system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling; 

@SpringBootApplication
@EnableScheduling
public class FuneralSystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(FuneralSystemApplication.class, args);
	}

}
