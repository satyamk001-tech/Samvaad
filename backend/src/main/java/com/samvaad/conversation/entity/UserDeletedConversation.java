package com.samvaad.conversation.entity;

import com.samvaad.user.entity.User;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_deleted_conversations", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_deleted_conv", columnNames = {"user_id", "conversation_id"})
})
public class UserDeletedConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @CreationTimestamp
    @Column(name = "deleted_at", nullable = false, updatable = false)
    private Instant deletedAt;

    public UserDeletedConversation() {}

    public UserDeletedConversation(User user, Conversation conversation) {
        this.user = user;
        this.conversation = conversation;
    }

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public Conversation getConversation() { return conversation; }
    public Instant getDeletedAt() { return deletedAt; }
}
