package com.viora.conversation.repository;

import com.viora.conversation.entity.Conversation;
import com.viora.conversation.entity.ConversationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query("""
        SELECT c FROM Conversation c
        JOIN ConversationMember cm ON c.id = cm.conversation.id
        WHERE cm.user.id = :userId AND cm.leftAt IS NULL
        ORDER BY c.updatedAt DESC
    """)
    List<Conversation> findAllByUserId(@Param("userId") UUID userId);

    @Query("""
        SELECT c FROM Conversation c
        JOIN ConversationMember cm1 ON c.id = cm1.conversation.id
        JOIN ConversationMember cm2 ON c.id = cm2.conversation.id
        WHERE c.type = 'DIRECT'
          AND cm1.user.id = :user1Id AND cm1.leftAt IS NULL
          AND cm2.user.id = :user2Id AND cm2.leftAt IS NULL
    """)
    Optional<Conversation> findDirectBetweenUsers(@Param("user1Id") UUID user1Id, @Param("user2Id") UUID user2Id);
}
