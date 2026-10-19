package com.samvaad.conversation.repository;

import com.samvaad.conversation.entity.UserDeletedConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserDeletedConversationRepository extends JpaRepository<UserDeletedConversation, UUID> {
    Optional<UserDeletedConversation> findByUserIdAndConversationId(UUID userId, UUID conversationId);
    void deleteByConversationId(UUID conversationId);
    void deleteByUserIdAndConversationId(UUID userId, UUID conversationId);
    boolean existsByUserIdAndConversationId(UUID userId, UUID conversationId);
}
