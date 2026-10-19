package com.samvaad.user.repository;

import com.samvaad.user.entity.UserBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserBlockRepository extends JpaRepository<UserBlock, UUID> {

    @Query("SELECT ub FROM UserBlock ub WHERE ub.blocker.id = :blockerId")
    List<UserBlock> findByBlockerId(@Param("blockerId") UUID blockerId);

    @Query("SELECT ub FROM UserBlock ub WHERE ub.blocker.id = :blockerId AND ub.blocked.id = :blockedId")
    Optional<UserBlock> findByBlockerIdAndBlockedId(@Param("blockerId") UUID blockerId, @Param("blockedId") UUID blockedId);

    @Query("SELECT COUNT(ub) > 0 FROM UserBlock ub WHERE (ub.blocker.id = :userA AND ub.blocked.id = :userB) OR (ub.blocker.id = :userB AND ub.blocked.id = :userA)")
    boolean isBlockedEitherWay(@Param("userA") UUID userA, @Param("userB") UUID userB);

    @Query("SELECT COUNT(ub) > 0 FROM UserBlock ub WHERE ub.blocker.id = :blockerId AND ub.blocked.id = :blockedId")
    boolean isBlocked(@Param("blockerId") UUID blockerId, @Param("blockedId") UUID blockedId);
}
