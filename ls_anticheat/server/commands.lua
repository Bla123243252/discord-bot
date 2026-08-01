local ESX = exports["es_extended"]:getSharedObject()

local function notify(src, msg)
    TriggerClientEvent("chat:addMessage", src, { args = { "^1[Anticheat]", msg } })
end

RegisterCommand("acban", function(source, args)
    local src = source
    if src ~= 0 and not AC_CanDo(src, "anticheat.ban") then
        return notify(src, "Keine Berechtigung.")
    end
    local targetId = tonumber(args[1])
    local duration = args[2]
    local reason = table.concat(args, " ", 3)
    if not targetId or not GetPlayerName(targetId) or not duration or reason == "" then
        return notify(src, "Nutzung: /acban <id> <minuten|permanent> <grund>")
    end
    local bannedBy = src == 0 and "CONSOLE" or GetPlayerName(src)
    local ok, err = AC_BanPlayer(targetId, duration, reason, bannedBy)
    notify(src, ok and ("ID " .. targetId .. " gebannt.") or ("Fehler: " .. tostring(err)))
end, false)

RegisterCommand("ackick", function(source, args)
    local src = source
    if src ~= 0 and not AC_CanDo(src, "anticheat.kick") then
        return notify(src, "Keine Berechtigung.")
    end
    local targetId = tonumber(args[1])
    local reason = table.concat(args, " ", 2)
    if not targetId or not GetPlayerName(targetId) then
        return notify(src, "Nutzung: /ackick <id> <grund>")
    end
    local kickedBy = src == 0 and "CONSOLE" or GetPlayerName(src)
    AC_KickPlayer(targetId, reason ~= "" and reason or "Kein Grund angegeben", kickedBy)
    notify(src, "ID " .. targetId .. " gekickt.")
end, false)

RegisterCommand("acunban", function(source, args)
    local src = source
    if src ~= 0 and not AC_CanDo(src, "anticheat.ban") then
        return notify(src, "Keine Berechtigung.")
    end
    local license = args[1]
    if not license then
        return notify(src, "Nutzung: /acunban <license>")
    end
    local unbannedBy = src == 0 and "CONSOLE" or GetPlayerName(src)
    local ok = AC_UnbanPlayer(license, unbannedBy)
    notify(src, ok and "Entbannt." or "Kein aktiver Ban für diese License gefunden.")
end, false)

RegisterCommand("acflags", function(source)
    local src = source
    if src ~= 0 and not AC_CanDo(src, "anticheat.view") then
        return notify(src, "Keine Berechtigung.")
    end
    local flags = AC_ListOpenFlags(10)
    if #flags == 0 then
        return notify(src, "Keine offenen Flags.")
    end
    for _, f in ipairs(flags) do
        notify(src, ("[%s/%s] %s (%s) - %s"):format(f.severity, f.module, f.player_name or "?", f.license, f.created_at))
    end
end, false)

-- /acwhitelist                                   -> listet alle aktiven Ausnahmen
-- /acwhitelist add <id|license> <modul|all> <grund> -> neue Ausnahme anlegen
-- /acwhitelist remove <id>                       -> entfernt einen Eintrag (id aus der Liste)
RegisterCommand("acwhitelist", function(source, args)
    local src = source
    if src ~= 0 and not AC_CanDo(src, "anticheat.ban") then
        return notify(src, "Keine Berechtigung.")
    end

    if args[1] == "remove" then
        local id = tonumber(args[2])
        if not id then return notify(src, "Nutzung: /acwhitelist remove <id>") end
        AC_RemoveWhitelist(id)
        return notify(src, "Whitelist-Eintrag " .. id .. " entfernt.")
    end

    if args[1] == "add" then
        local targetArg = args[2]
        local moduleArg = args[3]
        local reason = table.concat(args, " ", 4)
        if not targetArg or not moduleArg or reason == "" then
            return notify(src, "Nutzung: /acwhitelist add <id|license> <modul|all> <grund>  (module: movement|eventspam|resource|heartbeat|health|weapon|economy|aimbot|all)")
        end

        local license = targetArg
        local targetId = tonumber(targetArg)
        if targetId and GetPlayerName(targetId) then
            license = AC_GetIdentifiers(targetId)
            if not license then return notify(src, "Keine gültige License für ID " .. targetId .. " gefunden.") end
        end

        local module = moduleArg:lower() == "all" and nil or moduleArg:lower()
        local addedBy = src == 0 and "CONSOLE" or GetPlayerName(src)
        AC_AddWhitelist(license, module, reason, addedBy, nil)
        return notify(src, ("Whitelist hinzugefügt: %s (Modul: %s)"):format(license, module or "ALLE"))
    end

    local entries = AC_ListWhitelist()
    if #entries == 0 then
        return notify(src, "Keine aktiven Whitelist-Einträge (niemand ist ausgenommen).")
    end
    for _, e in ipairs(entries) do
        notify(src, ("#%d %s | Modul: %s | Grund: %s | von %s (%s)")
            :format(e.id, e.license, e.module or "ALLE", e.reason, e.added_by, e.added_at))
    end
end, false)
