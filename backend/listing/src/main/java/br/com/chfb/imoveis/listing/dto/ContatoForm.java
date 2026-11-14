package br.com.chfb.imoveis.listing.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContatoForm(
        @NotBlank @Size(max = 120) String nome,
        @NotBlank @Email @Size(max = 160) String email,
        @Size(max = 30) String telefone,
        @NotBlank @Size(max = 2000) String mensagem) {
}
