package com.viora.signaling.entity;

import com.viora.conversation.entity.Conversation;
import com.viora.user.entity.User;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "calls")
public class Call {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "caller_id", nullable = false)
    private User caller;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CallType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CallStatus status;

    @CreationTimestamp
    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds = 0;

    public Call() {}

    public Call(UUID id, User caller, User receiver, Conversation conversation, CallType type, CallStatus status, Instant startedAt, Instant endedAt, Integer durationSeconds) {
        this.id = id;
        this.caller = caller;
        this.receiver = receiver;
        this.conversation = conversation;
        this.type = type;
        this.status = status;
        this.startedAt = startedAt;
        this.endedAt = endedAt;
        this.durationSeconds = durationSeconds != null ? durationSeconds : 0;
    }

    public static Builder builder() {
        return new Builder();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getCaller() { return caller; }
    public void setCaller(User caller) { this.caller = caller; }

    public User getReceiver() { return receiver; }
    public void setReceiver(User receiver) { this.receiver = receiver; }

    public Conversation getConversation() { return conversation; }
    public void setConversation(Conversation conversation) { this.conversation = conversation; }

    public CallType getType() { return type; }
    public void setType(CallType type) { this.type = type; }

    public CallStatus getStatus() { return status; }
    public void setStatus(CallStatus status) { this.status = status; }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }

    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }

    public static class Builder {
        private UUID id;
        private User caller;
        private User receiver;
        private Conversation conversation;
        private CallType type;
        private CallStatus status;
        private Instant startedAt;
        private Instant endedAt;
        private Integer durationSeconds = 0;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder caller(User caller) { this.caller = caller; return this; }
        public Builder receiver(User receiver) { this.receiver = receiver; return this; }
        public Builder conversation(Conversation conversation) { this.conversation = conversation; return this; }
        public Builder type(CallType type) { this.type = type; return this; }
        public Builder status(CallStatus status) { this.status = status; return this; }
        public Builder startedAt(Instant startedAt) { this.startedAt = startedAt; return this; }
        public Builder endedAt(Instant endedAt) { this.endedAt = endedAt; return this; }
        public Builder durationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; return this; }

        public Call build() {
            return new Call(id, caller, receiver, conversation, type, status, startedAt, endedAt, durationSeconds);
        }
    }
}
