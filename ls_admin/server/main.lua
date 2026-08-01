local ESX = exports["es_extended"]:getSharedObject()

local aduty = {} -- [source] = true/false

-- ╔═══════════════════════════════════════════════╗
-- ║  Helfer                                        ║
-- ╚═══════════════════════════════════════════════╝
local function getGroup(src)
    local xPlayer = ESX.GetPlayerFromId(src)
    return xPlayer and xPlayer.getGroup() or "user"
end

--- Server-seitige Rechte-Prüfung (Gruppe ODER ACE).
local function canDo(src, perm)
    local group = getGroup(src)
    if GroupHasPerm(group, perm) then
        return true
    end
    -- Zusätzlich ACE: ace "ls_admin.<perm>" oder command.allow für group.admin
    if IsPlayerAceAllowed(src, "ls_admin." .. perm) then
        return true
    end
    return false
end

local function hasMenu(src)
    local role = GetRole(getGroup(src))
    if role and role.menu then return true end
    return IsPlayerAceAllowed(src, "ls_admin.menu")
end

--- Hat die Gruppe IRGENDEIN Recht in einer Kategorie? (z.B. "players")
local function canDoCategory(src, cat)
    local role = GetRole(getGroup(src))
    if role and role.perms then
        for _, p in ipairs(role.perms) do
            if p == "*" or p == cat .. ".*" or string.sub(p, 1, #cat + 1) == cat .. "." then
                return true
            end
        end
    end
    return IsPlayerAceAllowed(src, "ls_admin." .. cat)
end

--- Darf die Gruppe Fraktionsleitung-Funktionen nutzen? (NUR Config.FactionLeadGroups)
local function isFactionLead(src)
    return Config.FactionLeadGroups and Config.FactionLeadGroups[string.lower(getGroup(src))] == true
end

local function notify(src, msg, typ)
    TriggerClientEvent("ls_admin:notify", src, msg, typ or "info")
end

-- Exports für ls_adminpanel (NUI-Spielerübersicht) u.a.
exports("hasMenu", function(src) return hasMenu(src) end)
exports("canDo", function(src, perm) return canDo(src, perm) end)

-- ╔═══════════════════════════════════════════════╗
-- ║  Rolle / Menü-Daten an den Client geben        ║
-- ╚═══════════════════════════════════════════════╝
ESX.RegisterServerCallback("ls_admin:getMyRole", function(src, cb)
    local group = getGroup(src)
    local role = GetRole(group)
    cb({
        group = group,
        label = role and role.label or group,
        color = role and role.color or { 255, 255, 255 },
        perms = role and role.perms or {},
        menu = hasMenu(src),
        suitTex = role and role.suitTex or 0,
        aduty = aduty[src] or false,
    })
end)

-- ╔═══════════════════════════════════════════════╗
-- ║  ADuty                                         ║
-- ╚═══════════════════════════════════════════════╝
-- ADuty-Liste an ALLE Clients (Name über dem Kopf, sehen auch Nicht-Admins).
-- target = nil -> Broadcast an alle, sonst nur an diesen Spieler.
local tagHidden = {} -- [src] = true -> Kopf-Tag per /tag ausgeblendet (ADuty bleibt an)

local function broadcastAduty(target)
    local list = {}
    for src, on in pairs(aduty) do
        if on and not tagHidden[src] then
            local role = GetRole(getGroup(src))
            list[src] = {
                name = GetPlayerName(src) or "?",
                label = role and role.label or "Admin",
                color = role and role.color or { 255, 255, 255 },
            }
        end
    end
    TriggerClientEvent("ls_admin:adutyList", target or -1, list)
end

-- /tag: eigenen ADuty-Kopf-Tag an-/ausschalten (für ALLE unsichtbar)
RegisterCommand("tag", function(source)
    local src = source
    if src == 0 then return end
    if not canDo(src, "aduty") then
        return notify(src, "Keine Berechtigung.", "error")
    end
    tagHidden[src] = not tagHidden[src] or nil
    notify(src, tagHidden[src] and "Kopf-Tag: AUS (ADuty bleibt aktiv)." or "Kopf-Tag: AN.", tagHidden[src] and "info" or "success")
    broadcastAduty()
end, false)

RegisterNetEvent("ls_admin:toggleAduty", function()
    local src = source
    if not canDo(src, "aduty") then
        return notify(src, "Keine Berechtigung für ADuty.", "error")
    end
    aduty[src] = not aduty[src]
    TriggerClientEvent("ls_admin:setAduty", src, aduty[src])
    notify(src, aduty[src] and "ADuty aktiviert." or "ADuty deaktiviert.", aduty[src] and "success" or "info")
    print(("[ls_admin] %s (%s) ADuty: %s"):format(GetPlayerName(src) or "?", src, tostring(aduty[src])))
    broadcastAduty()
end)

-- Neue/ladende Spieler holen sich den aktuellen ADuty-Stand ab
RegisterNetEvent("ls_admin:requestAdutyList", function()
    broadcastAduty(source)
end)

AddEventHandler("playerDropped", function()
    local wasOnDuty = aduty[source]
    aduty[source] = nil
    tagHidden[source] = nil
    if wasOnDuty then broadcastAduty() end
end)

-- ╔═══════════════════════════════════════════════╗
-- ║  Nametag-Daten (nur für Berechtigte)           ║
-- ╚═══════════════════════════════════════════════╝
ESX.RegisterServerCallback("ls_admin:getPlayers", function(src, cb)
    if not (canDo(src, "nametags") or canDoCategory(src, "players")) then
        return cb({})
    end
    local list = {}
    for _, playerId in ipairs(GetPlayers()) do
        playerId = tonumber(playerId)
        local xTarget = ESX.GetPlayerFromId(playerId)
        if xTarget then
            local tgroup = xTarget.getGroup()
            local trole = GetRole(tgroup)
            list[#list + 1] = {
                id = playerId,
                name = GetPlayerName(playerId) or "?",
                job = xTarget.getJob() and xTarget.getJob().label or "Zivilist",
                group = tgroup,
                roleLabel = trole and trole.label or nil,
                roleColor = trole and trole.color or nil,
            }
        end
    end
    cb(list)
end)

-- ╔═══════════════════════════════════════════════╗
-- ║  Spieler-Aktionen (alle server-validiert)      ║
-- ╚═══════════════════════════════════════════════╝
local function getCoords(serverId)
    local ped = GetPlayerPed(serverId)
    if ped and ped ~= 0 then
        return GetEntityCoords(ped)
    end
    return nil
end

local function isOnline(serverId)
    return GetPlayerPed(serverId) ~= 0
end

-- Goto: Admin zum Ziel teleportieren
RegisterNetEvent("ls_admin:goto", function(target)
    local src = source
    if not canDo(src, "players.goto") then return notify(src, "Keine Berechtigung.", "error") end
    local coords = getCoords(target)
    if coords then
        TriggerClientEvent("ls_admin:teleport", src, coords.x, coords.y, coords.z)
        notify(src, "Teleportiert zu ID " .. target, "success")
    else
        notify(src, "Spieler nicht gefunden.", "error")
    end
end)

-- Bring: Ziel zum Admin holen
RegisterNetEvent("ls_admin:bring", function(target)
    local src = source
    if not canDo(src, "players.bring") then return notify(src, "Keine Berechtigung.", "error") end
    local coords = getCoords(src)
    if coords and isOnline(target) then
        TriggerClientEvent("ls_admin:teleport", target, coords.x, coords.y, coords.z)
        notify(src, "ID " .. target .. " geholt.", "success")
        notify(target, "Du wurdest von einem Admin geholt.", "info")
    else
        notify(src, "Spieler nicht gefunden.", "error")
    end
end)

-- Heal / Revive / Freeze: an den Ziel-Client weitergeben
RegisterNetEvent("ls_admin:healTarget", function(target)
    local src = source
    if not canDo(src, "players.heal") then return notify(src, "Keine Berechtigung.", "error") end
    TriggerClientEvent("ls_admin:doHeal", target)
    notify(src, "ID " .. target .. " geheilt.", "success")
end)

RegisterNetEvent("ls_admin:reviveTarget", function(target)
    local src = source
    if not canDo(src, "players.revive") then return notify(src, "Keine Berechtigung.", "error") end
    TriggerClientEvent("ls_admin:doRevive", target)
    notify(src, "ID " .. target .. " wiederbelebt.", "success")
end)

RegisterNetEvent("ls_admin:freezeTarget", function(target, st)
    local src = source
    if not canDo(src, "players.freeze") then return notify(src, "Keine Berechtigung.", "error") end
    TriggerClientEvent("ls_admin:doFreeze", target, st)
    notify(src, "ID " .. target .. (st and " eingefroren." or " aufgetaut."), "success")
end)

RegisterNetEvent("ls_admin:kickTarget", function(target, reason)
    local src = source
    if not canDo(src, "players.kick") then return notify(src, "Keine Berechtigung.", "error") end
    DropPlayer(target, "Gekickt von Admin: " .. (reason or "Kein Grund"))
    notify(src, "ID " .. target .. " gekickt.", "success")
end)

-- ╔═══════════════════════════════════════════════╗
-- ║  Event-Funktionen (Wetter/Zeit)                ║
-- ╚═══════════════════════════════════════════════╝
RegisterNetEvent("ls_admin:setWeather", function(weather)
    local src = source
    if not canDo(src, "event.weather") then return notify(src, "Keine Berechtigung.", "error") end
    TriggerClientEvent("ls_admin:applyWeather", -1, weather)
    notify(src, "Wetter: " .. weather, "success")
end)

RegisterNetEvent("ls_admin:setTime", function(hour)
    local src = source
    if not canDo(src, "event.time") then return notify(src, "Keine Berechtigung.", "error") end
    TriggerClientEvent("ls_admin:applyTime", -1, hour)
    notify(src, "Zeit: " .. hour .. ":00", "success")
end)

local function isOwner(src)
    return Config.TrollGroups and Config.TrollGroups[getGroup(src)] == true
end

-- ╔═══════════════════════════════════════════════╗
-- ║  Rückerstattung (Geld / Item / Waffe)          ║
-- ╚═══════════════════════════════════════════════╝
RegisterNetEvent("ls_admin:giveMoney", function(target, account, amount)
    local src = source
    if not canDo(src, "refund.money") then return notify(src, "Keine Berechtigung.", "error") end
    amount = tonumber(amount)
    local xTarget = ESX.GetPlayerFromId(target)
    if xTarget and amount and amount > 0 then
        xTarget.addAccountMoney(account, amount)
        notify(src, ("%s %s an ID %d gegeben."):format(amount, account, target), "success")
        notify(target, ("Du hast %s (%s) erhalten."):format(amount, account), "success")
    else
        notify(src, "Spieler/Betrag ungültig.", "error")
    end
end)

RegisterNetEvent("ls_admin:giveItem", function(target, item, count)
    local src = source
    if not canDo(src, "refund.item") then return notify(src, "Keine Berechtigung.", "error") end
    count = tonumber(count)
    local xTarget = ESX.GetPlayerFromId(target)
    if xTarget and item and count and count > 0 then
        xTarget.addInventoryItem(item, count)
        notify(src, ("%dx %s an ID %d gegeben."):format(count, item, target), "success")
    else
        notify(src, "Spieler/Item ungültig.", "error")
    end
end)

RegisterNetEvent("ls_admin:giveWeapon", function(target, weapon, ammo)
    local src = source
    if not canDo(src, "refund.weapon") then return notify(src, "Keine Berechtigung.", "error") end
    ammo = tonumber(ammo) or 100
    local xTarget = ESX.GetPlayerFromId(target)
    if xTarget and weapon then
        xTarget.addWeapon(string.upper(weapon), ammo)
        notify(src, ("Waffe %s an ID %d gegeben."):format(weapon, target), "success")
    else
        notify(src, "Spieler/Waffe ungültig.", "error")
    end
end)

-- ╔═══════════════════════════════════════════════╗
-- ║  Fraktionsleitung                              ║
-- ╚═══════════════════════════════════════════════╝
-- Fraktionsleitung-Ansage -> unser HUD-Announce (oben "Fraktionsleitung", darunter Text)
RegisterNetEvent("ls_admin:factionAnnounce", function(text)
    local src = source
    if not isFactionLead(src) then return notify(src, "Keine Berechtigung.", "error") end
    if type(text) ~= "string" or text == "" then return end
    TriggerClientEvent("hud:announce", -1, "Fraktionsleitung", text, 7)
end)

RegisterNetEvent("ls_admin:setJob", function(target, job, grade)
    local src = source
    if not canDo(src, "faction.setjob") then return notify(src, "Keine Berechtigung.", "error") end
    grade = tonumber(grade) or 0
    local xTarget = ESX.GetPlayerFromId(target)
    if xTarget and job then
        xTarget.setJob(job, grade)
        notify(src, ("ID %d -> Job %s (Grad %d)."):format(target, job, grade), "success")
        notify(target, ("Dein Job wurde auf %s gesetzt."):format(job), "info")
    else
        notify(src, "Spieler/Job ungültig.", "error")
    end
end)

ESX.RegisterServerCallback("ls_admin:getJobs", function(src, cb)
    if not canDo(src, "faction.teleport") then return cb({}) end
    local jobs = {}
    for name, job in pairs(ESX.GetJobs()) do
        jobs[#jobs + 1] = { name = name, label = job.label or name }
    end
    table.sort(jobs, function(a, b) return a.label < b.label end)
    cb(jobs)
end)

local function forEachInJob(job, fn)
    local count = 0
    for _, pid in ipairs(GetPlayers()) do
        pid = tonumber(pid)
        local xT = ESX.GetPlayerFromId(pid)
        if xT and xT.getJob() and xT.getJob().name == job then
            fn(pid)
            count = count + 1
        end
    end
    return count
end

RegisterNetEvent("ls_admin:teleportFaction", function(job)
    local src = source
    if not canDo(src, "faction.teleport") then return notify(src, "Keine Berechtigung.", "error") end
    local coords = getCoords(src)
    if not coords then return end
    local n = forEachInJob(job, function(pid)
        if pid ~= src then TriggerClientEvent("ls_admin:teleport", pid, coords.x, coords.y, coords.z) end
    end)
    notify(src, n .. " Mitglieder von '" .. job .. "' teleportiert.", "success")
end)

RegisterNetEvent("ls_admin:healFaction", function(job)
    local src = source
    if not canDo(src, "faction.teleport") then return notify(src, "Keine Berechtigung.", "error") end
    local n = forEachInJob(job, function(pid) TriggerClientEvent("ls_admin:doHeal", pid) end)
    notify(src, n .. " Mitglieder von '" .. job .. "' geheilt.", "success")
end)

RegisterNetEvent("ls_admin:reviveFaction", function(job)
    local src = source
    if not canDo(src, "faction.teleport") then return notify(src, "Keine Berechtigung.", "error") end
    local n = forEachInJob(job, function(pid) TriggerClientEvent("ls_admin:doRevive", pid) end)
    notify(src, n .. " Mitglieder von '" .. job .. "' wiederbelebt.", "success")
end)

-- ╔═══════════════════════════════════════════════╗
-- ║  Boss-Menü                                     ║
-- ╚═══════════════════════════════════════════════╝
RegisterNetEvent("ls_admin:setGroup", function(target, group)
    local src = source
    if not (canDo(src, "boss") or isOwner(src)) then return notify(src, "Keine Berechtigung.", "error") end
    local xTarget = ESX.GetPlayerFromId(target)
    if xTarget and Config.Roles[group] then
        xTarget.setGroup(group)
        notify(src, ("ID %d -> Gruppe %s."):format(target, group), "success")
        notify(target, ("Deine Gruppe wurde auf %s gesetzt."):format(group), "info")
    else
        notify(src, "Spieler/Gruppe ungültig.", "error")
    end
end)

RegisterNetEvent("ls_admin:announce", function(text)
    local src = source
    if not (canDo(src, "boss") or isOwner(src)) then return notify(src, "Keine Berechtigung.", "error") end
    -- Unser HUD-Announce (oben am Bildschirm) für alle Spieler
    TriggerClientEvent("hud:announce", -1, "Server Ansage", text, 7)
end)

RegisterNetEvent("ls_admin:allAction", function(kind)
    local src = source
    if not (canDo(src, "boss") or isOwner(src)) then return notify(src, "Keine Berechtigung.", "error") end
    local coords = getCoords(src)
    for _, pid in ipairs(GetPlayers()) do
        pid = tonumber(pid)
        if kind == "bring" and coords and pid ~= src then
            TriggerClientEvent("ls_admin:teleport", pid, coords.x, coords.y, coords.z)
        elseif kind == "heal" then
            TriggerClientEvent("ls_admin:doHeal", pid)
        elseif kind == "revive" then
            TriggerClientEvent("ls_admin:doRevive", pid)
        end
    end
    notify(src, "Aktion '" .. kind .. "' auf alle Spieler.", "success")
end)

-- ╔═══════════════════════════════════════════════╗
-- ║  Troll-Menü (NUR Owner)                        ║
-- ╚═══════════════════════════════════════════════╝
RegisterNetEvent("ls_admin:troll", function(target, kind)
    local src = source
    if not isOwner(src) then return notify(src, "Nur Owner.", "error") end
    if not isOnline(target) then return notify(src, "Spieler offline.", "error") end
    TriggerClientEvent("ls_admin:doTroll", target, kind)
    notify(src, ("Troll '%s' auf ID %d."):format(kind, target), "success")
end)

-- ╔═══════════════════════════════════════════════╗
-- ║  /calladmin – JEDER Spieler ruft das Team      ║
-- ╚═══════════════════════════════════════════════╝
local callCooldown = {} -- [src] = os.time(), ab dem wieder gerufen werden darf
local reports = {}      -- [reportId] = { id, playerId, name, reason, time, claimedBy, claimedName }
local nextReportId = 1

RegisterCommand("calladmin", function(source, args)
    local src = source
    if src == 0 then return end -- nur in-game
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return end

    local now = os.time()
    if callCooldown[src] and now < callCooldown[src] then
        return notify(src, ("Bitte warte noch %d Sekunden, bevor du erneut rufst."):format(callCooldown[src] - now), "error")
    end

    local reason = table.concat(args or {}, " ")
    if reason == "" then reason = "Keine Angabe" end

    -- Ticket anlegen (bleibt im /reportpanel, bis es geschlossen wird oder der Spieler disconnectet)
    local report = {
        id = nextReportId, playerId = src, name = GetPlayerName(src) or "?",
        reason = reason, time = now, claimedBy = nil, claimedName = nil,
    }
    nextReportId = nextReportId + 1
    reports[report.id] = report
    callCooldown[src] = now + (Config.CallAdminCooldown or 60)

    -- an alle Online-Teammitglieder (jede Rolle mit Menü-Zugriff, inkl. Rufer selbst falls Teammitglied)
    local delivered = 0
    for _, id in ipairs(GetPlayers()) do
        local pid = tonumber(id)
        if hasMenu(pid) then
            TriggerClientEvent("ls_admin:calladmin", pid, report.name, src, reason, report.id)
            delivered = delivered + 1
        end
    end

    if delivered > 0 then
        notify(src, ("Dein Report #%d wurde an %d Teammitglied%s gesendet."):format(report.id, delivered, delivered == 1 and "" or "er"), "success")
    else
        notify(src, ("Aktuell ist kein Teammitglied online – dein Report #%d wurde gespeichert."):format(report.id))
    end
    print(("[ls_admin] CALLADMIN #%d von %s (ID %d): %s -> %d Teammitglieder"):format(report.id, report.name, src, reason, delivered))
    TriggerClientEvent("ls_admin:reportsChanged", -1) -- offene Reportpanels aktualisieren
end, false)

-- ╔═══════════════════════════════════════════════╗
-- ║  /tc – Teamchat (Notify NUR für Teammitglieder)║
-- ╚═══════════════════════════════════════════════╝
RegisterCommand("tc", function(source, args)
    local src = source
    if src == 0 then return end
    if not hasMenu(src) then
        return notify(src, "Keine Berechtigung.", "error")
    end

    local msg = table.concat(args or {}, " ")
    if msg == "" then
        return notify(src, "Benutzung: /tc <nachricht>", "error")
    end
    msg = msg:gsub("<", "&lt;"):gsub(">", "&gt;") -- Notify rendert HTML

    local role = GetRole(getGroup(src))
    local label = role and role.label or getGroup(src)
    local name = GetPlayerName(src) or "?"

    for _, id in ipairs(GetPlayers()) do
        local pid = tonumber(id)
        if hasMenu(pid) then
            TriggerClientEvent("ls_admin:teamchat", pid, label, name, src, msg)
        end
    end
end, false)

-- ╔═══════════════════════════════════════════════╗
-- ║  /revive [id] – für JEDES Teammitglied         ║
-- ╚═══════════════════════════════════════════════╝
-- (Das alte /revive aus esx_ambulancejob ist dort auskommentiert – nur group.admin + Pflicht-ID.)
local function reviveTargetPlayer(target)
    if GetResourceState("esx_ambulancejob") == "started" then
        -- räumt das Todes-System sauber auf (Death-State, Respawn-Timer)
        TriggerClientEvent("esx_ambulancejob:revive", target)
    else
        TriggerClientEvent("ls_admin:doRevive", target)
    end
end

RegisterCommand("revive", function(source, args)
    local src = source
    local target = tonumber(args[1] or "")

    -- Server-Konsole/txAdmin: ID Pflicht
    if src == 0 then
        if not target then return print("[ls_admin] Benutzung: revive <id>") end
        if GetPlayerName(target) then
            reviveTargetPlayer(target)
            print(("[ls_admin] ID %d wiederbelebt."):format(target))
        else
            print(("[ls_admin] Spieler ID %d ist nicht online."):format(target))
        end
        return
    end

    -- Jedes Teammitglied: Menü-Zugriff ODER aduty-Recht (deckt auch creator/analyst/support ab)
    if not (hasMenu(src) or canDo(src, "aduty")) then
        return notify(src, "Keine Berechtigung.", "error")
    end

    target = target or src -- ohne ID = sich selbst wiederbeleben
    if not GetPlayerName(target) then
        return notify(src, ("Spieler ID %s ist nicht online."):format(args[1]), "error")
    end

    reviveTargetPlayer(target)
    if target == src then
        notify(src, "Du wurdest wiederbelebt.", "success")
    else
        notify(src, ("ID %d wiederbelebt."):format(target), "success")
        notify(target, "Du wurdest von einem Admin wiederbelebt.")
    end
end, false)

-- Report-Liste fürs /reportpanel (nur Teammitglieder)
ESX.RegisterServerCallback("ls_admin:getReports", function(src, cb)
    if not hasMenu(src) then return cb({}) end
    local list = {}
    for _, r in pairs(reports) do
        list[#list + 1] = {
            id = r.id, playerId = r.playerId, name = r.name,
            reason = r.reason, age = os.time() - r.time,
            claimedBy = r.claimedBy, claimedName = r.claimedName,
        }
    end
    table.sort(list, function(a, b) return a.id < b.id end)
    cb(list)
end)

RegisterNetEvent("ls_admin:claimReport", function(id)
    local src = source
    if not hasMenu(src) then return end
    local r = reports[id]
    if not r then return notify(src, "Report existiert nicht mehr.", "error") end
    if r.claimedBy and r.claimedBy ~= src then
        return notify(src, ("Report #%d ist bereits von %s übernommen."):format(id, r.claimedName or "?"), "error")
    end
    r.claimedBy = src
    r.claimedName = GetPlayerName(src) or "?"
    notify(src, ("Report #%d übernommen."):format(id), "success")
    if isOnline(r.playerId) then
        notify(r.playerId, ("Dein Report #%d wird jetzt von %s bearbeitet."):format(id, r.claimedName), "success")
    end
    -- restliches Team informieren (kein Doppel-Bearbeiten)
    for _, pid in ipairs(GetPlayers()) do
        pid = tonumber(pid)
        if pid ~= src and hasMenu(pid) then
            notify(pid, ("Report #%d wurde von %s übernommen."):format(id, r.claimedName))
        end
    end
    TriggerClientEvent("ls_admin:reportsChanged", -1)
end)

RegisterNetEvent("ls_admin:closeReport", function(id)
    local src = source
    if not hasMenu(src) then return end
    local r = reports[id]
    if not r then return notify(src, "Report existiert nicht mehr.", "error") end
    reports[id] = nil
    notify(src, ("Report #%d geschlossen."):format(id), "success")
    if r.playerId ~= src and isOnline(r.playerId) then
        notify(r.playerId, ("Dein Report #%d wurde bearbeitet und geschlossen."):format(id), "success")
    end
    print(("[ls_admin] Report #%d geschlossen von %s (ID %d)"):format(id, GetPlayerName(src) or "?", src))
    TriggerClientEvent("ls_admin:reportsChanged", -1)
end)

AddEventHandler("playerDropped", function()
    callCooldown[source] = nil
    -- Reports des Spielers entfernen, Claims des Admins freigeben
    for id, r in pairs(reports) do
        if r.playerId == source then
            reports[id] = nil
        elseif r.claimedBy == source then
            r.claimedBy = nil
            r.claimedName = nil
        end
    end
end)
