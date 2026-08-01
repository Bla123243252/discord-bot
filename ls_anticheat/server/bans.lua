-- Ban-Check beim Verbinden + Ban/Kick/Unban-Aktionen (von commands.lua und panel.lua genutzt).

-- Verschiebt den Spieler SOFORT in eine isolierte Dimension, damit er ab
-- diesem Zeitpunkt niemanden mehr sehen/beeinflussen kann - unabhängig
-- davon, ob der eigentliche DropPlayer/DB-Eintrag direkt danach noch
-- minimal verzögert ist (z.B. durch den awaited DB-Insert).
function AC_IsolatePlayer(src)
    pcall(function() SetPlayerRoutingBucket(src, Config.Ban.isolationBucket) end)
end

AddEventHandler("playerConnecting", function(name, setKickReason, deferrals)
    local src = source
    deferrals.defer()
    Wait(0) -- laut FiveM-Doku nötig, bevor GetPlayerIdentifiers vollständig gefüllt ist
    deferrals.update("Prüfe Ban-Status ...")

    local license, discord = AC_GetIdentifiers(src)
    local ip = GetPlayerEndpoint(src)

    if not license then
        return deferrals.done("Kein gültiges license-Identifier gefunden.")
    end

    local ban = AC_IsBanned(license, discord, ip)
    if ban then
        local msg = ("Du bist gebannt.\nGrund: %s\nDauer: %s\nBan-ID: #%d")
            :format(ban.reason, ban.expires_at and ("Läuft ab: " .. ban.expires_at) or "Permanent", ban.id)
        if Config.Ban.discordAppealUrl ~= "" then
            msg = msg .. "\nDiscord: " .. Config.Ban.discordAppealUrl
        end
        return deferrals.done(msg)
    end

    deferrals.done()
end)

-- durationStr: "permanent" oder Minuten als Zahl (String)
function AC_BanPlayer(targetSrc, durationStr, reason, bannedBy)
    local license, discord = AC_GetIdentifiers(targetSrc)
    if not license then return false, "Kein license-Identifier für Ziel gefunden." end
    local ip = GetPlayerEndpoint(targetSrc)
    local name = GetPlayerName(targetSrc)

    local expiresAt = nil
    if durationStr ~= "permanent" then
        local minutes = tonumber(durationStr)
        if not minutes or minutes <= 0 then return false, "Ungültige Dauer." end
        expiresAt = os.date("%Y-%m-%d %H:%M:%S", os.time() + minutes * 60)
    end

    AC_IsolatePlayer(targetSrc)
    local banId = AC_InsertBan(license, discord, ip, name, reason, bannedBy, expiresAt)
    DropPlayer(targetSrc, "Gebannt (#" .. banId .. "): " .. reason)
    AC_AlertBan("Spieler gebannt", ("**%s** wurde gebannt (#%d).\nGrund: %s\nDauer: %s\nVon: %s")
        :format(name, banId, reason, durationStr == "permanent" and "Permanent" or (durationStr .. " Minuten"), bannedBy))
    return true
end

-- Bannt eine (aktuell offline) License direkt, ohne Ziel-Source (z.B. aus
-- dem Panel heraus für einen Spieler, der bereits disconnected ist).
function AC_BanByLicense(license, durationStr, reason, bannedBy)
    local expiresAt = nil
    if durationStr ~= "permanent" then
        local minutes = tonumber(durationStr)
        if not minutes or minutes <= 0 then return false, "Ungültige Dauer." end
        expiresAt = os.date("%Y-%m-%d %H:%M:%S", os.time() + minutes * 60)
    end
    local banId = AC_InsertBan(license, nil, nil, nil, reason, bannedBy, expiresAt)
    AC_AlertBan("Spieler gebannt (offline)", ("License `%s` wurde gebannt (#%d).\nGrund: %s\nDauer: %s\nVon: %s")
        :format(license, banId, reason, durationStr == "permanent" and "Permanent" or (durationStr .. " Minuten"), bannedBy))
    return true
end

function AC_UnbanPlayer(license, unbannedBy)
    local affected = AC_Unban(license, unbannedBy)
    if affected and affected > 0 then
        AC_AlertBan("Spieler entbannt", ("License `%s` wurde entbannt von %s."):format(license, unbannedBy))
        return true
    end
    return false
end

function AC_KickPlayer(targetSrc, reason, kickedBy)
    local name = GetPlayerName(targetSrc)
    AC_IsolatePlayer(targetSrc)
    DropPlayer(targetSrc, "Gekickt: " .. reason)
    AC_AlertBan("Spieler gekickt", ("**%s** wurde gekickt.\nGrund: %s\nVon: %s"):format(name, reason, kickedBy))
end
