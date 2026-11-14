package br.com.chfb.imoveis.coreapi.config;

import java.nio.file.Path;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Serve os arquivos enviados (fotos, logos, favicon) em /app/public/uploads/**. */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    public static final String UPLOADS_PATH = "/app/public/uploads/";

    private final AppProperties props;

    public WebConfig(AppProperties props) {
        this.props = props;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String local = Path.of(props.uploads().dir()).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler(UPLOADS_PATH + "**").addResourceLocations(local.endsWith("/") ? local : local + "/")
                .setCachePeriod(60 * 60 * 24 * 30);
    }
}
