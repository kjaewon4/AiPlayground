package com.example.aiplaygroundspring.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api")
public class mobilenetController {
    private final WebClient webClient;

    public mobilenetController(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    // 예: /api/proxy?url=https://tfhub.dev/...
    @GetMapping("/proxy")
    public Mono<ResponseEntity<String>> proxy(@RequestParam String url) {
        return webClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(String.class)
                .map(response -> ResponseEntity.ok(response))
                .onErrorResume(e -> Mono.just(ResponseEntity
                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("프록시 요청 실패: " + e.getMessage())));
    }

}
