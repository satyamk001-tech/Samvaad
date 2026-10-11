package com.viora.messaging.repository;

import com.viora.messaging.entity.MessageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageStatusRepository extends JpaRepository<MessageStatus, UUID> {

    List<MessageStatus> findByMessageId(UUID messageId);

    Optional<MessageStatus> findByMessageIdAndUserId(UUID messageId, UUID userId);
}
