package com.samvaad.conversation.entity;

import com.samvaad.user.entity.User;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversation_members", uniqueConstraints = {
        @UniqueConstraint(name = "uk_conversation_user", columnNames = {"conversation_id", "user_id"})
})
public class ConversationMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConversationRole role = ConversationRole.MEMBER;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    @Column(name = "left_at")
    private Instant leftAt;

    public ConversationMember() {}

    public ConversationMember(UUID id, Conversation conversation, User user, ConversationRole role, Instant joinedAt, Instant leftAt) {
        this.id = id;
        this.conversation = conversation;
        this.user = user;
        this.role = role != null ? role : ConversationRole.MEMBER;
        this.joinedAt = joinedAt;
        this.leftAt = leftAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Conversation getConversation() { return conversation; }
    public void setConversation(Conversation conversation) { this.conversation = conversation; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public ConversationRole getRole() { return role; }
    public void setRole(ConversationRole role) { this.role = role; }

    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }

    public Instant getLeftAt() { return leftAt; }
    public void setLeftAt(Instant leftAt) { this.leftAt = leftAt; }

    public static class Builder {
        private UUID id;
        private Conversation conversation;
        private User user;
        private ConversationRole role = ConversationRole.MEMBER;
        private Instant leftAt;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder conversation(Conversation conversation) { this.conversation = conversation; return this; }
        public Builder user(User user) { this.user = user; return this; }
        public Builder role(ConversationRole role) { this.role = role; return this; }
        public Builder leftAt(Instant leftAt) { this.leftAt = leftAt; return this; }

        public ConversationMember build() {
            return new ConversationMember(id, conversation, user, role, null, leftAt);
        }
    }
}
