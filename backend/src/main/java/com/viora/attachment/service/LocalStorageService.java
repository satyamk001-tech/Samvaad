package com.viora.attachment.service;

import com.viora.common.exception.BadRequestException;
import com.viora.common.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class LocalStorageService implements StorageService {

    private final Path rootLocation;

    public LocalStorageService(@Value("${viora.storage.local-dir:./uploads}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage location: " + this.rootLocation, e);
        }
    }

    @Override
    public String store(MultipartFile file, String destinationSubPath) throws IOException {
        if (file.isEmpty()) {
            throw new BadRequestException("Failed to store empty file");
        }

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "unnamed");
        if (originalFilename.contains("..")) {
            throw new BadRequestException("Cannot store file with relative path outside current directory " + originalFilename);
        }

        // Generate a collision-free filename
        String extension = "";
        int dotIdx = originalFilename.lastIndexOf('.');
        if (dotIdx > 0) {
            extension = originalFilename.substring(dotIdx);
        }
        String storedFilename = UUID.randomUUID() + extension;

        Path targetDir = this.rootLocation.resolve(destinationSubPath).normalize();
        Files.createDirectories(targetDir);

        Path targetLocation = targetDir.resolve(storedFilename).normalize();
        // Prevent path traversal outside root
        if (!targetLocation.startsWith(this.rootLocation)) {
            throw new BadRequestException("Cannot store file outside current directory");
        }

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
        }

        // Return relative path key
        return this.rootLocation.relativize(targetLocation).toString().replace('\\', '/');
    }

    @Override
    public Resource loadAsResource(String storageKey) {
        try {
            Path file = this.rootLocation.resolve(storageKey).normalize();
            if (!file.startsWith(this.rootLocation)) {
                throw new BadRequestException("Access denied to path traversal key");
            }
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("Could not read file: " + storageKey);
            }
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("Could not read file: " + storageKey);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            Path file = this.rootLocation.resolve(storageKey).normalize();
            if (file.startsWith(this.rootLocation)) {
                Files.deleteIfExists(file);
            }
        } catch (IOException ignored) {
        }
    }
}
