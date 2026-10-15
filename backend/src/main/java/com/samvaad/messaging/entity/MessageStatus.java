package com.samvaad.messaging.entity;

import com.samvaad.user.entity.User;
import jakarta.persistence.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "message_status", uniqueConstraints = {
        @UniqueConstraint(name = "uk_message_user_status", columnNames = {"message_id", "user_id"})
})
public class MessageStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MessageStatusType status;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public MessageStatus() {}

    public MessageStatus(UUID id, Message message, User user, MessageStatusType status, Instant updatedAt) {
        this.id = id;
        this.message = message;
        this.user = user;
        this.status = status;
        this.updatedAt = updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Message getMessage() { return message; }
    public void setMessage(Message message) { this.message = message; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public MessageStatusType getStatus() { return status; }
    public void setStatus(MessageStatusType status) { this.status = status; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public static class Builder {
        private UUID id;
        private Message message;
        private User user;
        private MessageStatusType status;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder message(Message message) { this.message = message; return this; }
        public Builder user(User user) { this.user = user; return this; }
        public Builder status(MessageStatusType status) { this.status = status; return this; }

        public MessageStatus build() {
            return new MessageStatus(id, message, user, status, null);
        }
    }
}
