package br.com.chfb.imoveis.coreapi.security;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.DelegatingSecurityContextRepository;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import br.com.chfb.imoveis.coreapi.config.AppProperties;
import br.com.chfb.imoveis.coreapi.repository.UsuarioRepository;
import br.com.chfb.imoveis.coreapi.service.ApiTokenService;

/**
 * Três cadeias de segurança:
 * <ol>
 *     <li><b>/api/v1/**</b> - API aberta: sem sessão, sem CSRF, autenticação por token Bearer;</li>
 *     <li><b>/app/**</b> - API do site: cookie de sessão + CSRF + trava de origem (só o front usa);</li>
 *     <li>demais rotas (arquivos estáticos, se o front for servido pelo WAR).</li>
 * </ol>
 * O acesso por perfil segue o prefixo: /app/admin e /api/v1/admin exigem ADMIN,
 * /app/corretor e /api/v1/corretor exigem CORRETOR. A consulta pública não exige login.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final String SESSION_COOKIE = "IMOVEIS_SESSION";

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new DelegatingSecurityContextRepository(new RequestAttributeSecurityContextRepository(),
                new HttpSessionSecurityContextRepository());
    }

    @Bean
    @Order(1)
    SecurityFilterChain apiAberta(HttpSecurity http, ApiTokenService tokens, AppProperties props) throws Exception {
        http.securityMatcher("/api/v1/**")
                .cors(c -> c.configurationSource(corsApi(props)))
                .csrf(c -> c.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(r -> r.disable())
                .formLogin(f -> f.disable())
                .httpBasic(b -> b.disable())
                .logout(l -> l.disable())
                .addFilterBefore(new ApiTokenAuthenticationFilter(tokens), AnonymousAuthenticationFilter.class)
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/corretor/**").hasRole("CORRETOR")
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint(bearerEntryPoint()).accessDeniedHandler(negado()));
        return http.build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain apiDoSite(HttpSecurity http, AppProperties props, SecurityContextRepository repo,
            UsuarioRepository usuarios) throws Exception {
        http.securityMatcher("/app/**")
                .cors(c -> c.configurationSource(corsSite(props)))
                .csrf(c -> c.spa())
                .addFilterBefore(new FrontendOnlyFilter(props.security().frontendOrigins()), CsrfFilter.class)
                .securityContext(sc -> sc.securityContextRepository(repo))
                // conta desativada/banida perde a sessão na hora
                .addFilterAfter(new ContaAtivaFilter(usuarios), SecurityContextHolderFilter.class)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation(f -> f.changeSessionId()))
                .requestCache(r -> r.disable())
                .formLogin(f -> f.disable())
                .httpBasic(b -> b.disable())
                .logout(l -> l.logoutUrl("/app/auth/logout")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
                        .deleteCookies(SESSION_COOKIE, "JSESSIONID")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/app/public/**", "/app/auth/**").permitAll()
                        .requestMatchers("/app/admin/**").hasRole("ADMIN")
                        .requestMatchers("/app/corretor/**").hasRole("CORRETOR")
                        .requestMatchers("/app/uploads/**").hasAnyRole("CORRETOR", "ADMIN")
                        // tokens da API aberta: só corretores e administradores (clientes não têm)
                        .requestMatchers("/app/conta/tokens/**").hasAnyRole("CORRETOR", "ADMIN")
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint(sessaoEntryPoint()).accessDeniedHandler(negado()))
                .headers(h -> h.frameOptions(f -> f.deny()));
        return http.build();
    }

    @Bean
    @Order(3)
    SecurityFilterChain demais(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(a -> a.anyRequest().permitAll())
                .csrf(c -> c.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.NEVER))
                .formLogin(f -> f.disable())
                .httpBasic(b -> b.disable())
                .logout(l -> l.disable());
        return http.build();
    }

    private static AuthenticationEntryPoint bearerEntryPoint() {
        return (req, res, ex) -> {
            res.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
            JsonErrorWriter.write(req, res, 401, "Unauthorized", "Informe um token: Authorization: Bearer <token>.");
        };
    }

    private static AuthenticationEntryPoint sessaoEntryPoint() {
        return (req, res, ex) -> JsonErrorWriter.write(req, res, 401, "Unauthorized", "Faça login para continuar.");
    }

    private static AccessDeniedHandler negado() {
        return (req, res, ex) -> JsonErrorWriter.write(req, res, 403, "Forbidden",
                "Seu perfil não tem acesso a este recurso.");
    }

    private static UrlBasedCorsConfigurationSource corsSite(AppProperties props) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(props.security().frontendOrigins());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN", "X-Requested-With"));
        c.setAllowCredentials(true);
        c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/app/**", c);
        return src;
    }

    private static UrlBasedCorsConfigurationSource corsApi(AppProperties props) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOriginPatterns(props.security().apiCorsOrigins());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        c.setAllowCredentials(false);
        c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/api/v1/**", c);
        return src;
    }
}
