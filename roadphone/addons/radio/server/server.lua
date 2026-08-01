-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  RoadPhone Radio Addon - Server                                   ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Aktive Radio-Mitglieder: [frequency] = { [src] = playerName }
local radioMembers = {}

-- ── Spieler tritt Kanal bei ──────────────────────────────────────────
RegisterNetEvent('roadphone:radio:join')
AddEventHandler('roadphone:radio:join', function(frequency)
    local src  = source
    local name = GetPlayerName(src) or 'Unbekannt'

    frequency = tostring(frequency)

    if not radioMembers[frequency] then
        radioMembers[frequency] = {}
    end

    -- Aus alten Kanälen entfernen
    for frq, members in pairs(radioMembers) do
        if frq ~= frequency and members[src] then
            members[src] = nil
            -- Anderen auf diesem Kanal mitteilen
            for memberSrc in pairs(members) do
                TriggerClientEvent('roadphone:radio:memberLeft', memberSrc, {
                    src  = src,
                    name = name,
                    frq  = frq,
                })
            end
        end
    end

    radioMembers[frequency][src] = name

    -- Allen auf diesem Kanal die aktualisierte Mitgliederliste schicken
    local memberList = {}
    for memberSrc, memberName in pairs(radioMembers[frequency]) do
        table.insert(memberList, { src = memberSrc, name = memberName })
    end

    for memberSrc in pairs(radioMembers[frequency]) do
        TriggerClientEvent('roadphone:radio:updateMembers', memberSrc, {
            frequency = frequency,
            members   = memberList,
        })
    end
end)

-- ── Spieler verlässt Kanal ───────────────────────────────────────────
RegisterNetEvent('roadphone:radio:leave')
AddEventHandler('roadphone:radio:leave', function(frequency)
    local src  = source
    local name = GetPlayerName(src) or 'Unbekannt'

    frequency = tostring(frequency)

    if radioMembers[frequency] then
        radioMembers[frequency][src] = nil

        -- Allen auf diesem Kanal mitteilen
        local memberList = {}
        for memberSrc, memberName in pairs(radioMembers[frequency]) do
            table.insert(memberList, { src = memberSrc, name = memberName })
            TriggerClientEvent('roadphone:radio:memberLeft', memberSrc, {
                src  = src,
                name = name,
                frq  = frequency,
            })
        end

        -- Verlassenden selbst updaten
        TriggerClientEvent('roadphone:radio:updateMembers', src, {
            frequency = frequency,
            members   = memberList,
        })
    end
end)

-- ── Mitglieder eines Kanals abfragen ────────────────────────────────
RegisterNetEvent('roadphone:radio:getMembers')
AddEventHandler('roadphone:radio:getMembers', function(frequency)
    local src = source
    frequency = tostring(frequency)

    local memberList = {}
    if radioMembers[frequency] then
        for memberSrc, memberName in pairs(radioMembers[frequency]) do
            table.insert(memberList, { src = memberSrc, name = memberName })
        end
    end

    TriggerClientEvent('roadphone:radio:updateMembers', src, {
        frequency = frequency,
        members   = memberList,
    })
end)

-- ── Zuletzt genutzten Kanal speichern ───────────────────────────────
RegisterNetEvent('roadphone:radio:addRecent')
AddEventHandler('roadphone:radio:addRecent', function(frequency)
    -- roadphone verarbeitet das intern
end)

-- ── Cleanup bei Disconnect ───────────────────────────────────────────
AddEventHandler('playerDropped', function()
    local src  = source
    local name = GetPlayerName(src) or 'Unbekannt'

    for frequency, members in pairs(radioMembers) do
        if members[src] then
            members[src] = nil
            for memberSrc in pairs(members) do
                TriggerClientEvent('roadphone:radio:memberLeft', memberSrc, {
                    src  = src,
                    name = name,
                    frq  = frequency,
                })
            end
        end
    end
end)
