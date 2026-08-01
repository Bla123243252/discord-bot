-- oxmysql-Wrapper für ls_anticheat. Legt Tabellen beim Resource-Start an.

CreateThread(function()
    local ddl = LoadResourceFile(GetCurrentResourceName(), "sql/install.sql")
    if not ddl then return end
    for statement in ddl:gmatch("[^;]+;") do
        MySQL.query.await(statement)
    end
end)

function AC_IsBanned(license, discord, ip)
    local rows = MySQL.query.await([[
        SELECT id, reason, expires_at FROM ls_anticheat_bans
        WHERE active = 1
          AND (license = ? OR (discord IS NOT NULL AND discord = ?) OR (ip IS NOT NULL AND ip = ?))
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
    ]], { license, discord, ip })
    return rows and rows[1] or nil
end

-- Gibt die neue Ban-ID zurück (für den Ban-Screen/Discord-Alert).
function AC_InsertBan(license, discord, ip, lastName, reason, bannedBy, expiresAt)
    return MySQL.insert.await([[
        INSERT INTO ls_anticheat_bans (license, discord, ip, last_name, reason, banned_by, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ]], { license, discord, ip, lastName, reason, bannedBy, expiresAt })
end

function AC_Unban(license, unbannedBy)
    return MySQL.update.await([[
        UPDATE ls_anticheat_bans SET active = 0, unbanned_by = ?, unbanned_at = NOW()
        WHERE license = ? AND active = 1
    ]], { unbannedBy, license })
end

function AC_InsertFlag(license, playerName, module, severity, details, coords, actionTaken)
    return MySQL.insert.await([[
        INSERT INTO ls_anticheat_flags (license, player_name, module, severity, details, coords, action_taken)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ]], {
        license, playerName, module, severity,
        details and json.encode(details) or nil,
        coords, actionTaken or "none",
    })
end

function AC_ListOpenFlags(limit)
    return MySQL.query.await([[
        SELECT * FROM ls_anticheat_flags WHERE reviewed = 0
        ORDER BY created_at DESC LIMIT ?
    ]], { limit or 50 })
end

function AC_MarkFlagReviewed(flagId, reviewedBy)
    return MySQL.update.await([[
        UPDATE ls_anticheat_flags SET reviewed = 1, reviewed_by = ?, reviewed_at = NOW()
        WHERE id = ?
    ]], { reviewedBy, flagId })
end

function AC_IsWhitelisted(license, module)
    local rows = MySQL.query.await([[
        SELECT id FROM ls_anticheat_whitelist
        WHERE license = ? AND (module IS NULL OR module = ?)
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
    ]], { license, module })
    return rows and rows[1] ~= nil
end

function AC_AddWhitelist(license, module, reason, addedBy, expiresAt)
    MySQL.insert.await([[
        INSERT INTO ls_anticheat_whitelist (license, module, reason, added_by, expires_at)
        VALUES (?, ?, ?, ?, ?)
    ]], { license, module, reason, addedBy, expiresAt })
end

-- Alle aktuell aktiven (noch nicht abgelaufenen) Whitelist-Einträge, neueste zuerst.
function AC_ListWhitelist()
    return MySQL.query.await([[
        SELECT * FROM ls_anticheat_whitelist
        WHERE expires_at IS NULL OR expires_at > NOW()
        ORDER BY added_at DESC
    ]])
end

function AC_RemoveWhitelist(id)
    return MySQL.query.await("DELETE FROM ls_anticheat_whitelist WHERE id = ?", { id })
end

function AC_ListActiveBans()
    return MySQL.query.await([[
        SELECT * FROM ls_anticheat_bans WHERE active = 1 ORDER BY banned_at DESC
    ]])
end
