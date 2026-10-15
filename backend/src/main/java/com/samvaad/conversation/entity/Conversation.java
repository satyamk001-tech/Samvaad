package com.samvaad.conversation.entity;

import com.samvaad.user.entity.User;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConversationType type;

    @Column(length = 100)
    private String title;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "disappearing_seconds")
    private Integer disappearingSeconds;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Conversation() {}

    public Conversation(UUID id, ConversationType type, String title, String avatarUrl, User createdBy, Integer disappearingSeconds, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.avatarUrl = avatarUrl;
        this.createdBy = createdBy;
        this.disappearingSeconds = disappearingSeconds;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public ConversationType getType() { return type; }
    public void setType(ConversationType type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public Integer getDisappearingSeconds() { return disappearingSeconds; }
    public void setDisappearingSeconds(Integer disappearingSeconds) { this.disappearingSeconds = disappearingSeconds; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public static class Builder {
        private UUID id;
        private ConversationType type;
        private String title;
        private String avatarUrl;
        private User createdBy;
        private Integer disappearingSeconds;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder type(ConversationType type) { this.type = type; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder avatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; return this; }
        public Builder createdBy(User createdBy) { this.createdBy = createdBy; return this; }
        public Builder disappearingSeconds(Integer disappearingSeconds) { this.disappearingSeconds = disappearingSeconds; return this; }

        public Conversation build() {
            return new Conversation(id, type, title, avatarUrl, createdBy, disappearingSeconds, null, null);
        }
    }
}
