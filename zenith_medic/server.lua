-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  ZENITH MEDIC DISPATCH - Server                                   ║
-- ╚══════════════════════════════════════════════════════════════════╝
local ESX = exports['es_extended']:getSharedObject()

-- Aktive Dispatch-Einträge: [id] = { src, name, coords, reason, time, acceptedBy }
local dispatches  = {}
local dispatchId  = 0

-- ── Hilfsfunktionen ──────────────────────────────────────────────────
local function getIdentifier(src)
    local xPlayer = ESX.GetPlayerFromId(src)
    return xPlayer and xPlayer.getIdentifier() or 'unknown'
end

local function broadcastToMedics(event, data)
    local players = ESX.GetPlayers()
    for _, src in ipairs(players) do
        local xPlayer = ESX.GetPlayerFromId(src)
        if xPlayer then
            local job = xPlayer.getJob()
            if Config.AllowedJobs[job.name] then
                TriggerClientEvent(event, src, data)
            end
        end
    end
end

local function discordLog(title, msg)
    if not Config.Webhook or Config.Webhook == '' then return end
    local embed = {
        {
            title       = title,
            description = msg,
            color       = 16711680,
            footer      = { text = 'Zenith Medic Dispatch • ' .. os.date('%d.%m.%Y %H:%M') }
        }
    }
    PerformHttpRequest(Config.Webhook, function() end, 'POST',
        json.encode({ username = 'Zenith Medic', embeds = embed }),
        { ['Content-Type'] = 'application/json' })
end

-- ── Dispatch senden (von Client wenn Spieler bewusstlos) ─────────────
RegisterNetEvent('zenith_medic:sendDispatch')
AddEventHandler('zenith_medic:sendDispatch', function(data)
    local src    = source
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return end

    dispatchId = dispatchId + 1
    local id   = dispatchId
    local name = xPlayer.getName()
    local now  = os.time()

    dispatches[id] = {
        id         = id,
        src        = src,
        name       = name,
        coords     = data.coords,
        reason     = data.reason or 'Bewusstlos',
        time       = now,
        acceptedBy = nil,
        closed     = false,
    }

    -- Alle Medics benachrichtigen
    broadcastToMedics('zenith_medic:newDispatch', dispatches[id])

    -- Discord Log
    discordLog('🚑 Neuer Dispatch',
        ('**Spieler:** %s\n**Grund:** %s\n**Zeit:** %s'):format(
            name, data.reason or 'Bewusstlos', os.date('%H:%M', now)))

    print(('[zenith_medic] Neuer Dispatch #%d von %s (%s)'):format(id, name, data.reason or 'Bewusstlos'))
end)

-- ── Dispatch annehmen ────────────────────────────────────────────────
RegisterNetEvent('zenith_medic:acceptDispatch')
AddEventHandler('zenith_medic:acceptDispatch', function(id)
    local src     = source
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return end

    local job = xPlayer.getJob()
    if not Config.AllowedJobs[job.name] then return end

    local dispatch = dispatches[id]
    if not dispatch or dispatch.closed then
        TriggerClientEvent('zenith_medic:notify', src, 'error', 'Dieser Auftrag ist nicht mehr verfügbar!')
        return
    end

    dispatch.acceptedBy = src
    dispatches[id]      = dispatch

    local medicName = xPlayer.getName()

    -- Medic bekommt die Koordinaten für den Blip
    TriggerClientEvent('zenith_medic:dispatchAccepted', src, dispatch)

    -- Anderen Medics mitteilen wer übernimmt
    broadcastToMedics('zenith_medic:dispatchTaken', { id = id, medicName = medicName })

    -- Bewusstlosem sagen wer kommt
    if dispatch.src and GetPlayerPing(dispatch.src) > 0 then
        TriggerClientEvent('zenith_medic:notify', dispatch.src, 'success',
            ('Ein Sanitäter ist unterwegs! (%s)'):format(medicName))
    end

    discordLog('✅ Dispatch angenommen',
        ('**Dispatch #%d** wurde von **%s** angenommen.\n**Patient:** %s'):format(
            id, medicName, dispatch.name))
end)

-- ── Dispatch schließen (nach Versorgung) ────────────────────────────
RegisterNetEvent('zenith_medic:closeDispatch')
AddEventHandler('zenith_medic:closeDispatch', function(id)
    local src     = source
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return end

    local dispatch = dispatches[id]
    if not dispatch then return end

    dispatch.closed = true
    dispatches[id]  = dispatch

    -- Blip bei allen Medics entfernen
    broadcastToMedics('zenith_medic:removeBlip', { id = id })

    discordLog('🏁 Dispatch geschlossen',
        ('**Dispatch #%d** wurde von **%s** geschlossen.\n**Patient:** %s'):format(
            id, xPlayer.getName(), dispatch.name))
end)

-- ── Alle aktiven Dispatches abrufen (beim Öffnen des Menüs) ─────────
RegisterNetEvent('zenith_medic:getDispatches')
AddEventHandler('zenith_medic:getDispatches', function()
    local src     = source
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return end

    local job = xPlayer.getJob()
    if not Config.AllowedJobs[job.name] then
        TriggerClientEvent('zenith_medic:notify', src, 'error', 'Kein Zugriff!')
        return
    end

    local active = {}
    for id, d in pairs(dispatches) do
        if not d.closed then
            table.insert(active, d)
        end
    end

    TriggerClientEvent('zenith_medic:loadDispatches', src, active)
end)

-- ── Spieler wiederbelebt → Dispatch schließen ────────────────────────
RegisterNetEvent('zenith_medic:playerRevived')
AddEventHandler('zenith_medic:playerRevived', function(patientSrc)
    -- Dispatch des Patienten suchen und schließen
    for id, d in pairs(dispatches) do
        if d.src == patientSrc and not d.closed then
            d.closed = true
            dispatches[id] = d
            broadcastToMedics('zenith_medic:removeBlip', { id = id })
            break
        end
    end
end)

-- ── Cleanup wenn Spieler disconnected ───────────────────────────────
AddEventHandler('playerDropped', function()
    local src = source
    for id, d in pairs(dispatches) do
        if d.src == src and not d.closed then
            d.closed = true
            dispatches[id] = d
            broadcastToMedics('zenith_medic:removeBlip', { id = id })
        end
    end
end)
