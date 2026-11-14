package br.com.chfb.imoveis.coreapi.config;

import org.springframework.boot.web.servlet.ServletContextInitializer;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import jakarta.servlet.ServletContext;
import jakarta.servlet.SessionCookieConfig;
import jakarta.servlet.SessionTrackingMode;

import java.util.EnumSet;

/**
 * Aplica as propriedades {@code server.servlet.session.cookie.*} também quando o WAR
 * roda em um Tomcat externo (o Spring Boot só as aplica no servidor embutido).
 * O SameSite no Tomcat externo vem de {@code META-INF/context.xml}.
 */
@Component
public class SessionCookieInitializer implements ServletContextInitializer {

    private final Environment env;

    public SessionCookieInitializer(Environment env) {
        this.env = env;
    }

    @Override
    public void onStartup(ServletContext servletContext) {
        try {
            SessionCookieConfig cookie = servletContext.getSessionCookieConfig();
            cookie.setName(env.getProperty("server.servlet.session.cookie.name", "IMOVEIS_SESSION"));
            cookie.setHttpOnly(env.getProperty("server.servlet.session.cookie.http-only", Boolean.class, true));
            cookie.setSecure(env.getProperty("server.servlet.session.cookie.secure", Boolean.class, true));
            cookie.setPath(env.getProperty("server.servlet.session.cookie.path", "/"));
            servletContext.setSessionTrackingModes(EnumSet.of(SessionTrackingMode.COOKIE));
        } catch (IllegalStateException jaInicializado) {
            // O contexto já foi configurado (servidor embutido): nada a fazer.
        }
    }
}
