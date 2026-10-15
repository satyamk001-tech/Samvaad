package com.viora.attachment.controller;

import com.viora.auth.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/vault")
public class SovereignVaultController {

    private final JdbcTemplate jdbcTemplate;

    public SovereignVaultController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/documents")
    public ResponseEntity<List<Map<String, Object>>> getVaultDocuments(@AuthenticationPrincipal UserPrincipal principal) {
        List<Map<String, Object>> docs = jdbcTemplate.query(
                "SELECT id, doc_type, doc_number, doc_name, file_url, issuer, is_verified, verified_at, created_at FROM sovereign_vault_docs WHERE user_id = ? ORDER BY created_at DESC",
                (rs, rowNum) -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", rs.getString("id"));
                    map.put("docType", rs.getString("doc_type"));
                    map.put("docNumber", rs.getString("doc_number"));
                    map.put("docName", rs.getString("doc_name"));
                    map.put("fileUrl", rs.getString("file_url"));
                    map.put("issuer", rs.getString("issuer"));
                    map.put("isVerified", rs.getBoolean("is_verified"));
                    map.put("verifiedAt", rs.getTimestamp("verified_at") != null ? rs.getTimestamp("verified_at").toString() : null);
                    map.put("createdAt", rs.getTimestamp("created_at").toString());
                    return map;
                },
                principal.getId()
        );

        // If user has no documents yet, seed sovereign mock documents for demonstration
        if (docs.isEmpty()) {
            seedInitialSovereignDocs(principal.getId());
            return getVaultDocuments(principal);
        }

        return ResponseEntity.ok(docs);
    }

    @PostMapping("/documents/add")
    public ResponseEntity<Map<String, Object>> addDocument(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID docId = UUID.randomUUID();
        String docType = body.getOrDefault("docType", "CUSTOM");
        String docNumber = body.getOrDefault("docNumber", "IN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        String docName = body.getOrDefault("docName", "Sovereign Document");
        String fileUrl = body.getOrDefault("fileUrl", "https://samvaad.gov.in/vault/" + docId);
        String issuer = body.getOrDefault("issuer", "DigiLocker Verified");

        jdbcTemplate.update(
                "INSERT INTO sovereign_vault_docs (id, user_id, doc_type, doc_number, doc_name, file_url, issuer, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)",
                docId, principal.getId(), docType, docNumber, docName, fileUrl, issuer
        );

        return ResponseEntity.ok(Map.of(
                "id", docId.toString(),
                "docType", docType,
                "docNumber", docNumber,
                "docName", docName,
                "fileUrl", fileUrl,
                "issuer", issuer,
                "isVerified", true
        ));
    }

    private void seedInitialSovereignDocs(UUID userId) {
        jdbcTemplate.update(
                """
                INSERT INTO sovereign_vault_docs (id, user_id, doc_type, doc_number, doc_name, file_url, issuer, is_verified) VALUES
                (gen_random_uuid(), ?, 'AADHAAR', 'XXXX-XXXX-4912', 'Aadhaar Sovereign Identity Card', '/vault/aadhaar_verified.pdf', 'UIDAI Sovereign Vault', TRUE),
                (gen_random_uuid(), ?, 'PAN', 'ABCDE1234F', 'Permanent Account Number (PAN)', '/vault/pan_verified.pdf', 'Income Tax Dept (DigiLocker)', TRUE),
                (gen_random_uuid(), ?, 'DRIVING_LICENSE', 'DL-0420110098765', 'Smart Driving License', '/vault/dl_verified.pdf', 'MoRTH (National Register)', TRUE)
                """,
                userId, userId, userId
        );
    }
}
