-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  ZENITH MEDIC DISPATCH - Client                                   ║
-- ╚══════════════════════════════════════════════════════════════════╝
local ESX      = exports['es_extended']:getSharedObject()
local blips    = {}   -- [dispatchId] = blipHandle
local menuOpen = false
local isMedic  = false

-- ── Job prüfen ───────────────────────────────────────────────────────
AddEventHandler('esx:setJob', function(job)
    isMedic = Config.AllowedJobs[job.name] == true
end)

CreateThread(function()
    while ESX.GetPlayerData().job == nil do Wait(200) end
    local job = ESX.GetPlayerData().job
    isMedic = Config.AllowedJobs[job.name] == true
end)

-- ── /medic Command ───────────────────────────────────────────────────
RegisterCommand('medic', function()
    if not isMedic then
        ESX.ShowNotification('~r~Kein Zugriff! Nur für LSMD-Mitarbeiter.')
        return
    end
    -- Dispatches vom Server holen
    TriggerServerEvent('zenith_medic:getDispatches')
end, false)

-- ── Dispatches laden → Menü öffnen ──────────────────────────────────
RegisterNetEvent('zenith_medic:loadDispatches')
AddEventHandler('zenith_medic:loadDispatches', function(dispatches)
    menuOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action    = 'open',
        dispatches = dispatches,
    })
end)

-- ── Neuer Dispatch eingetroffen ──────────────────────────────────────
RegisterNetEvent('zenith_medic:newDispatch')
AddEventHandler('zenith_medic:newDispatch', function(dispatch)
    if not isMedic then return end

    -- Blip auf der Karte
    addDispatchBlip(dispatch)

    -- Sound + Benachrichtigung
    PlaySoundFrontend(-1, 'Beep_Red', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', true)

    ESX.ShowNotification(('~r~🚨 Neuer Dispatch: ~w~%s ~s~(%s)'):format(
        dispatch.name, dispatch.reason))

    -- Menü aktualisieren falls offen
    if menuOpen then
        SendNUIMessage({ action = 'addDispatch', dispatch = dispatch })
    end
end)

-- ── Dispatch angenommen (Bestätigung) ────────────────────────────────
RegisterNetEvent('zenith_medic:dispatchAccepted')
AddEventHandler('zenith_medic:dispatchAccepted', function(dispatch)
    -- Route setzen
    SetNewWaypoint(dispatch.coords.x, dispatch.coords.y)
    ESX.ShowNotification(('~g~✅ Auftrag angenommen! ~w~Route zu %s gesetzt.'):format(dispatch.name))

    -- Blip hervorheben
    if blips[dispatch.id] then
        SetBlipColour(blips[dispatch.id], 2) -- Grün = mein Auftrag
        SetBlipScale(blips[dispatch.id], 1.2)
        ShowHeadingIndicatorOnBlip(blips[dispatch.id], true)
    end

    if menuOpen then
        SetNuiFocus(false, false)
        menuOpen = false
        SendNUIMessage({ action = 'close' })
    end
end)

-- ── Dispatch wurde von jemand anderem übernommen ─────────────────────
RegisterNetEvent('zenith_medic:dispatchTaken')
AddEventHandler('zenith_medic:dispatchTaken', function(data)
    if menuOpen then
        SendNUIMessage({ action = 'dispatchTaken', id = data.id, medicName = data.medicName })
    end
    -- Blip grau machen
    if blips[data.id] then
        SetBlipColour(blips[data.id], 4) -- Grau = übernommen
    end
end)

-- ── Dispatch entfernen ────────────────────────────────────────────────
RegisterNetEvent('zenith_medic:removeBlip')
AddEventHandler('zenith_medic:removeBlip', function(data)
    if blips[data.id] then
        RemoveBlip(blips[data.id])
        blips[data.id] = nil
    end
    if menuOpen then
        SendNUIMessage({ action = 'removeDispatch', id = data.id })
    end
end)

-- ── Notify ───────────────────────────────────────────────────────────
RegisterNetEvent('zenith_medic:notify')
AddEventHandler('zenith_medic:notify', function(type, msg)
    if type == 'success' then
        ESX.ShowNotification('~g~' .. msg)
    elseif type == 'error' then
        ESX.ShowNotification('~r~' .. msg)
    else
        ESX.ShowNotification('~w~' .. msg)
    end
end)

-- ── Automatischer Dispatch wenn Spieler bewusstlos ───────────────────
-- (wird von esx_ambulancejob gefeuert)
AddEventHandler('esx_ambulancejob:playerDied', function()
    if not Config.AutoDispatch then return end
    local ped    = PlayerPedId()
    local coords = GetEntityCoords(ped)
    TriggerServerEvent('zenith_medic:sendDispatch', {
        coords = { x = coords.x, y = coords.y, z = coords.z },
        reason = 'Bewusstlos',
    })
end)

-- Fallback: auch über esx:onPlayerDeath
AddEventHandler('esx:onPlayerDeath', function()
    if not Config.AutoDispatch then return end
    local ped    = PlayerPedId()
    local coords = GetEntityCoords(ped)
    TriggerServerEvent('zenith_medic:sendDispatch', {
        coords = { x = coords.x, y = coords.y, z = coords.z },
        reason = 'Bewusstlos',
    })
end)

-- ── NUI Callbacks ────────────────────────────────────────────────────
RegisterNUICallback('closeMenu', function(data, cb)
    SetNuiFocus(false, false)
    menuOpen = false
    cb({})
end)

RegisterNUICallback('acceptDispatch', function(data, cb)
    TriggerServerEvent('zenith_medic:acceptDispatch', data.id)
    SetNuiFocus(false, false)
    menuOpen = false
    cb({})
end)

RegisterNUICallback('closeDispatch', function(data, cb)
    TriggerServerEvent('zenith_medic:closeDispatch', data.id)
    cb({})
end)

-- ESC im Spiel schließt auch das Menü
CreateThread(function()
    while true do
        Wait(0)
        if menuOpen then
            -- Pause-Menü öffnet sich → NUI schließen
            if IsPauseMenuActive() then
                SetNuiFocus(false, false)
                menuOpen = false
                SendNUIMessage({ action = 'close' })
            end
        else
            Wait(200)
        end
    end
end)

-- ── Hilfsfunktion: Blip hinzufügen ──────────────────────────────────
function addDispatchBlip(dispatch)
    if blips[dispatch.id] then
        RemoveBlip(blips[dispatch.id])
    end
    local blip = AddBlipForCoord(dispatch.coords.x, dispatch.coords.y, dispatch.coords.z)
    SetBlipSprite(blip, Config.Blip.Sprite)
    SetBlipColour(blip, Config.Blip.Color)
    SetBlipScale(blip, Config.Blip.Scale)
    SetBlipAsShortRange(blip, false)
    BeginTextCommandSetBlipName('STRING')
    AddTextComponentString(('Patient: %s'):format(dispatch.name))
    EndTextCommandSetBlipName(blip)
    blips[dispatch.id] = blip
end

-- Marker deaktiviert
