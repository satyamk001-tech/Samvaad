package com.viora.messaging.entity;

import com.viora.conversation.entity.Conversation;
import com.viora.user.entity.User;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_message_id")
    private Message replyToMessage;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MessageType type = MessageType.TEXT;

    @Column(name = "is_edited", nullable = false)
    private boolean isEdited = false;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "is_view_once", nullable = false)
    private boolean isViewOnce = false;

    @Column(name = "viewed_at")
    private Instant viewedAt;

    @Column(name = "is_forwarded", nullable = false)
    private boolean isForwarded = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "forwarded_from_id")
    private User forwardedFrom;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Message() {}

    public Message(UUID id, Conversation conversation, User sender, Message replyToMessage, String content, MessageType type, boolean isEdited, boolean isDeleted, boolean isViewOnce, Instant viewedAt, boolean isForwarded, User forwardedFrom, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.conversation = conversation;
        this.sender = sender;
        this.replyToMessage = replyToMessage;
        this.content = content;
        this.type = type != null ? type : MessageType.TEXT;
        this.isEdited = isEdited;
        this.isDeleted = isDeleted;
        this.isViewOnce = isViewOnce;
        this.viewedAt = viewedAt;
        this.isForwarded = isForwarded;
        this.forwardedFrom = forwardedFrom;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Conversation getConversation() { return conversation; }
    public void setConversation(Conversation conversation) { this.conversation = conversation; }

    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }

    public Message getReplyToMessage() { return replyToMessage; }
    public void setReplyToMessage(Message replyToMessage) { this.replyToMessage = replyToMessage; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }

    public boolean isEdited() { return isEdited; }
    public void setEdited(boolean edited) { isEdited = edited; }

    public boolean isDeleted() { return isDeleted; }
    public void setDeleted(boolean deleted) { isDeleted = deleted; }

    public boolean isViewOnce() { return isViewOnce; }
    public void setViewOnce(boolean viewOnce) { isViewOnce = viewOnce; }

    public Instant getViewedAt() { return viewedAt; }
    public void setViewedAt(Instant viewedAt) { this.viewedAt = viewedAt; }

    public boolean isForwarded() { return isForwarded; }
    public void setForwarded(boolean forwarded) { isForwarded = forwarded; }

    public User getForwardedFrom() { return forwardedFrom; }
    public void setForwardedFrom(User forwardedFrom) { this.forwardedFrom = forwardedFrom; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public static class Builder {
        private UUID id;
        private Conversation conversation;
        private User sender;
        private Message replyToMessage;
        private String content;
        private MessageType type = MessageType.TEXT;
        private boolean isEdited = false;
        private boolean isDeleted = false;
        private boolean isViewOnce = false;
        private Instant viewedAt;
        private boolean isForwarded = false;
        private User forwardedFrom;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder conversation(Conversation conversation) { this.conversation = conversation; return this; }
        public Builder sender(User sender) { this.sender = sender; return this; }
        public Builder replyToMessage(Message replyToMessage) { this.replyToMessage = replyToMessage; return this; }
        public Builder content(String content) { this.content = content; return this; }
        public Builder type(MessageType type) { this.type = type; return this; }
        public Builder isEdited(boolean isEdited) { this.isEdited = isEdited; return this; }
        public Builder isDeleted(boolean isDeleted) { this.isDeleted = isDeleted; return this; }
        public Builder isViewOnce(boolean isViewOnce) { this.isViewOnce = isViewOnce; return this; }
        public Builder viewedAt(Instant viewedAt) { this.viewedAt = viewedAt; return this; }
        public Builder isForwarded(boolean isForwarded) { this.isForwarded = isForwarded; return this; }
        public Builder forwardedFrom(User forwardedFrom) { this.forwardedFrom = forwardedFrom; return this; }

        public Message build() {
            return new Message(id, conversation, sender, replyToMessage, content, type, isEdited, isDeleted, isViewOnce, viewedAt, isForwarded, forwardedFrom, null, null);
        }
    }
}
