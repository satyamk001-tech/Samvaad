package com.samvaad.signaling.repository;

import com.samvaad.signaling.entity.Call;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CallRepository extends JpaRepository<Call, UUID> {

    @Query("""
        SELECT c FROM Call c
        WHERE c.caller.id = :userId OR c.receiver.id = :userId
        ORDER BY c.startedAt DESC
    """)
    Page<Call> findUserCallHistory(@Param("userId") UUID userId, Pageable pageable);
}
