package br.com.chfb.imoveis.coreapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.AutoConfigurationPackage;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

/**
 * Aplicação principal (empacotada como WAR).
 * <p>
 * Os componentes, entidades e repositórios de todos os módulos ficam em
 * {@code br.com.chfb.imoveis.*}, por isso a varredura parte desse pacote.
 * <p>
 * O login é próprio (sessão e tokens), sem {@code UserDetailsService}: a autoconfiguração que cria um usuário
 * em memória (e escreve "Using generated security password" no console) fica desligada.
 */
@SpringBootApplication(scanBasePackages = "br.com.chfb.imoveis", exclude = UserDetailsServiceAutoConfiguration.class)
@AutoConfigurationPackage(basePackages = "br.com.chfb.imoveis")
@ConfigurationPropertiesScan("br.com.chfb.imoveis")
public class ImoveisApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(ImoveisApplication.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
        return builder.sources(ImoveisApplication.class);
    }
}
