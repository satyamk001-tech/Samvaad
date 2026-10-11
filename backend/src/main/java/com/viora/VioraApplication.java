package com.viora;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class VioraApplication {

    public static void main(String[] args) {
        SpringApplication.run(VioraApplication.class, args);
    }
}
