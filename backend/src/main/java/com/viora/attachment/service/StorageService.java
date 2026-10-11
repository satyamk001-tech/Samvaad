package com.viora.attachment.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface StorageService {

    /**
     * Stores a file and returns its unique storage key/path.
     */
    String store(MultipartFile file, String destinationSubPath) throws IOException;

    /**
     * Loads a file resource by its unique storage key.
     */
    Resource loadAsResource(String storageKey);

    /**
     * Deletes a file by its unique storage key.
     */
    void delete(String storageKey);
}
