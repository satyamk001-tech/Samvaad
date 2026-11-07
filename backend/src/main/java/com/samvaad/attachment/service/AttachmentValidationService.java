package com.samvaad.attachment.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Set;

@Service
public class AttachmentValidationService {

    public static final long MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB max

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp", "gif", "pdf", "mp3", "ogg", "wav", "mp4"
    );

    private static final byte[] JPEG_MAGIC = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47};
    private static final byte[] PDF_MAGIC = new byte[]{0x25, 0x50, 0x44, 0x46};

    public void validateAttachment(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Upload payload cannot be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds 25 MB limit");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            throw new IllegalArgumentException("Filename must contain a valid extension");
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("File extension ." + extension + " is not permitted");
        }

        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[8];
            int read = is.read(header);
            if (read < 4) {
                throw new IllegalArgumentException("Corrupted file header");
            }

            if (("jpg".equals(extension) || "jpeg".equals(extension)) && !matchesMagic(header, JPEG_MAGIC)) {
                throw new SecurityException("MIME type spoofing detected: header does not match JPEG magic signature");
            }

            if ("png".equals(extension) && !matchesMagic(header, PNG_MAGIC)) {
                throw new SecurityException("MIME type spoofing detected: header does not match PNG magic signature");
            }

            if ("pdf".equals(extension) && !matchesMagic(header, PDF_MAGIC)) {
                throw new SecurityException("MIME type spoofing detected: header does not match PDF magic signature");
            }

        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to read file header for validation", e);
        }
    }

    private boolean matchesMagic(byte[] fileHeader, byte[] magicBytes) {
        for (int i = 0; i < magicBytes.length; i++) {
            if (fileHeader[i] != magicBytes[i]) return false;
        }
        return true;
    }
}
