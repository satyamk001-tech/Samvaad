package com.samvaad.conversation.repository;

import com.samvaad.conversation.entity.ConversationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationMemberRepository extends JpaRepository<ConversationMember, UUID> {

    List<ConversationMember> findByConversationIdAndLeftAtIsNull(UUID conversationId);

    Optional<ConversationMember> findByConversationIdAndUserIdAndLeftAtIsNull(UUID conversationId, UUID userId);

    Optional<ConversationMember> findByConversationIdAndUserId(UUID conversationId, UUID userId);

    @Query("SELECT COUNT(cm) > 0 FROM ConversationMember cm WHERE cm.conversation.id = :conversationId AND cm.user.id = :userId AND cm.leftAt IS NULL")
    boolean isMember(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

    @Query("SELECT COUNT(cm) > 0 FROM ConversationMember cm WHERE cm.conversation.id = :conversationId AND cm.user.id = :userId AND cm.role = 'ADMIN' AND cm.leftAt IS NULL")
    boolean isAdmin(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

    void deleteByUserId(UUID userId);
}
