-- Erkennt Clients, deren ls_anticheat-Skript nicht mehr antwortet
-- (z.B. weil ein externes Tool die Resource eingefroren/gekillt hat).

local lastSeen = {}    -- [src] = ms
local misses = {}      -- [src] = Anzahl aufeinanderfolgender verpasster Fenster

RegisterNetEvent("ls_anticheat:heartbeat", function()
    local src = source
    lastSeen[src] = GetGameTimer()
    misses[src] = 0
end)

AddEventHandler("playerJoining", function()
    lastSeen[source] = GetGameTimer()
    misses[source] = 0
end)

CreateThread(function()
    while true do
        Wait(Config.Heartbeat.intervalMs)
        local now = GetGameTimer()
        for _, src in ipairs(GetPlayers()) do
            src = tonumber(src)
            local seen = lastSeen[src]
            if seen and (now - seen) > Config.Heartbeat.graceMs and not AC_IsBypassed(src) then
                misses[src] = (misses[src] or 0) + 1
                lastSeen[src] = now -- Fenster neu starten, um nicht jeden Tick erneut zu zählen

                if misses[src] >= 2 then
                    local license = AC_GetIdentifiers(src)
                    AC_InsertFlag(license, GetPlayerName(src), "heartbeat", "high",
                        { misses = misses[src] }, nil, "kicked")
                    AC_AlertFlag("Heartbeat ausgeblieben", ("**%s** hat 2x in Folge kein Heartbeat gesendet (evtl. Anticheat-Script eingefroren/gekillt). Auto-Kick."):format(GetPlayerName(src)))
                    AC_IsolatePlayer(src)
                    DropPlayer(src, "Anticheat: Client antwortet nicht.")
                end
            end
        end
    end
end)

AddEventHandler("playerDropped", function()
    local src = source
    lastSeen[src] = nil
    misses[src] = nil
end)
