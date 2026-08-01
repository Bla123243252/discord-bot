-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  RoadPhone Radio Addon - Client                                   ║
-- ║  Integriert lb-radioapp Funktionalität direkt in roadphone        ║
-- ╚══════════════════════════════════════════════════════════════════╝

local currentFrequency = nil
local currentMembers   = {}
local radioVolume      = Radio.DefaultVolume or 80
local pma              = exports['pma-voice']

-- ── Hilfsfunktionen ──────────────────────────────────────────────────
local function isJobAllowed(frequency)
    local frqNum = tonumber(frequency)
    if not frqNum then return true end

    for _, locked in ipairs(Radio.LockedChannels or {}) do
        if locked.frq == frqNum then
            -- Job prüfen
            local playerJob = ESX and ESX.GetPlayerData().job.name or ''
            for _, allowedJob in ipairs(locked.jobs or {}) do
                if allowedJob == playerJob then return true end
            end
            return false
        end
    end
    return true
end

local function hasRadioItem()
    if not Radio.NeedItem then return true end
    -- Item-Check via ESX
    if ESX then
        local items = ESX.GetPlayerData().inventory or {}
        for _, item in ipairs(items) do
            if item.name == Radio.Item and item.count > 0 then
                return true
            end
        end
        return false
    end
    return true
end

-- ── NUI → Lua Bridge ────────────────────────────────────────────────

-- Kanal beitreten
RegisterNUICallback('radio:join', function(data, cb)
    local frequency = tostring(data.frequency or '1')

    if not hasRadioItem() then
        TriggerEvent('roadphone:sendNotification', {
            apptitle = 'Radio',
            title    = 'Kein Funkgerät',
            message  = 'Du brauchst ein Funkgerät!',
            img      = '/public/img/Apps/light_mode/radio.webp'
        })
        cb({ success = false })
        return
    end

    if not isJobAllowed(frequency) then
        TriggerEvent('roadphone:sendNotification', {
            apptitle = 'Radio',
            title    = 'Gesperrter Kanal',
            message  = 'Du hast keinen Zugriff auf diesen Kanal!',
            img      = '/public/img/Apps/light_mode/radio.webp'
        })
        cb({ success = false })
        return
    end

    -- Alten Kanal verlassen
    if currentFrequency then
        pma:removePlayerFromRadio()
        TriggerServerEvent('roadphone:radio:leave', currentFrequency)
    end

    -- Neuen Kanal beitreten
    currentFrequency = frequency
    pma:addPlayerToRadio(frequency)
    pma:setVoiceProperty('radioEnabled', true)
    pma:setVoiceProperty('micClicks', true)
    pma:setRadioVolume(radioVolume)

    TriggerServerEvent('roadphone:radio:join', frequency)

    -- roadphone internen State setzen
    setInRadio(true)

    TriggerEvent('roadphone:sendNotification', {
        apptitle = 'Radio',
        title    = 'Verbunden',
        message  = 'Kanal ' .. frequency .. ' beigetreten',
        img      = '/public/img/Apps/light_mode/radio.webp'
    })

    cb({ success = true, frequency = frequency })
end)

-- Kanal verlassen
RegisterNUICallback('radio:leave', function(data, cb)
    if not currentFrequency then
        cb({ success = false })
        return
    end

    pma:removePlayerFromRadio()
    pma:setVoiceProperty('radioEnabled', false)

    TriggerServerEvent('roadphone:radio:leave', currentFrequency)
    currentFrequency = nil
    currentMembers   = {}

    setInRadio(false)

    TriggerEvent('roadphone:sendNotification', {
        apptitle = 'Radio',
        title    = 'Getrennt',
        message  = 'Du hast den Kanal verlassen',
        img      = '/public/img/Apps/light_mode/radio.webp'
    })

    cb({ success = true })
end)

-- Lautstärke setzen
RegisterNUICallback('radio:setVolume', function(data, cb)
    radioVolume = tonumber(data.volume) or 80
    pma:setRadioVolume(radioVolume)
    cb({ success = true })
end)

-- Mitglieder abrufen
RegisterNUICallback('radio:getMembers', function(data, cb)
    local frequency = tostring(data.frequency or currentFrequency or '1')
    TriggerServerEvent('roadphone:radio:getMembers', frequency)
    cb({ success = true })
end)

-- Status abrufen
RegisterNUICallback('radio:getState', function(data, cb)
    cb({
        connected  = currentFrequency ~= nil,
        frequency  = currentFrequency,
        volume     = radioVolume,
        members    = currentMembers,
    })
end)

-- ── Server → Client Events ───────────────────────────────────────────

-- Mitgliederliste aktualisiert
RegisterNetEvent('roadphone:radio:updateMembers')
AddEventHandler('roadphone:radio:updateMembers', function(data)
    if data.frequency == currentFrequency then
        currentMembers = data.members or {}
        SendNUIMessage({
            event     = 'radio:membersUpdate',
            frequency = data.frequency,
            members   = currentMembers,
        })
    end
end)

-- Mitglied hat Kanal verlassen
RegisterNetEvent('roadphone:radio:memberLeft')
AddEventHandler('roadphone:radio:memberLeft', function(data)
    SendNUIMessage({
        event    = 'radio:memberLeft',
        src      = data.src,
        name     = data.name,
        frq      = data.frq,
    })
end)

-- ── roadphone: Funk verlassen wenn tot ───────────────────────────────
AddEventHandler('roadphone:client:leaveradio', function()
    if currentFrequency then
        pma:removePlayerFromRadio()
        pma:setVoiceProperty('radioEnabled', false)
        TriggerServerEvent('roadphone:radio:leave', currentFrequency)
        currentFrequency = nil
        currentMembers   = {}
    end
end)

-- ── pma-voice: Sprechen-Status ans NUI senden ────────────────────────
CreateThread(function()
    while true do
        Wait(200)
        if currentFrequency then
            local talking = NetworkIsPlayerTalking(PlayerId())
            SendNUIMessage({
                event   = 'radio:talkingState',
                talking = talking,
            })
        else
            Wait(1000)
        end
    end
end)

-- ── Beim Öffnen der Radio-App State laden ────────────────────────────
-- roadphone schickt 'openApp' wenn eine App geöffnet wird
RegisterNetEvent('roadphone:openApp')
AddEventHandler('roadphone:openApp', function(app)
    if app == 'radio' then
        SendNUIMessage({
            event      = 'radio:init',
            connected  = currentFrequency ~= nil,
            frequency  = currentFrequency,
            volume     = radioVolume,
            members    = currentMembers,
        })
    end
end)
