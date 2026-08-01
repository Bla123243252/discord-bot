-- Event-Rate-Limiter für eine konfigurierte Liste "sensibler" NetEvents
-- (siehe Config.EventRateLimit.monitoredEvents). FiveM erlaubt keinen
-- generischen Hook auf "irgendein Event" - ls_anticheat registriert sich
-- daher als zusätzlicher (Beobachter-)Handler auf genau diese Eventnamen,
-- zählt Aufrufe pro Spieler und kickt bei Flood. Es kann den Effekt des
-- Events beim eigentlichen Handler nicht verhindern, erkennt und
-- unterbindet aber wiederholten Missbrauch (die eigentliche Härtung bleibt
-- die serverseitige Validierung im jeweiligen Event-Handler selbst, z.B.
-- wie in ls_shops:checkout).

local counts = {}    -- [src][eventName] = { perSecond = {t,...}, perMinute = {t,...} }
local floodHits = {} -- [src] = { [eventName]=lastSeenMs, ... }

local function nowMs() return GetGameTimer() end

local function limitsFor(eventName)
    local o = Config.EventRateLimit.perEvent[eventName]
    return (o and o.perSecond) or Config.EventRateLimit.defaultMaxPerSecond,
           (o and o.perMinute) or Config.EventRateLimit.defaultMaxPerMinute
end

local function prune(list, windowMs)
    local cutoff = nowMs() - windowMs
    local kept = {}
    for _, t in ipairs(list) do
        if t >= cutoff then kept[#kept + 1] = t end
    end
    return kept
end

local function onMonitoredEvent(eventName)
    local src = source
    if src == 0 or AC_IsBypassed(src) then return end

    counts[src] = counts[src] or {}
    counts[src][eventName] = counts[src][eventName] or { perSecond = {}, perMinute = {} }
    local c = counts[src][eventName]

    c.perSecond = prune(c.perSecond, 1000)
    c.perMinute = prune(c.perMinute, 60000)
    table.insert(c.perSecond, nowMs())
    table.insert(c.perMinute, nowMs())

    local maxPerSecond, maxPerMinute = limitsFor(eventName)
    if #c.perSecond <= maxPerSecond and #c.perMinute <= maxPerMinute then return end

    local license = AC_GetIdentifiers(src)
    if AC_IsWhitelisted(license, "eventspam") then return end

    AC_InsertFlag(license, GetPlayerName(src), "eventspam", "warn",
        { event = eventName, perSecond = #c.perSecond, perMinute = #c.perMinute }, nil, "none")

    floodHits[src] = floodHits[src] or {}
    floodHits[src][eventName] = nowMs()
    local distinctRecent = 0
    for ev, t in pairs(floodHits[src]) do
        if nowMs() - t > 60000 then
            floodHits[src][ev] = nil
        else
            distinctRecent = distinctRecent + 1
        end
    end

    if distinctRecent >= Config.EventRateLimit.floodKickThreshold then
        AC_AlertFlag("Event-Flood erkannt", ("**%s** flutete %d verschiedene Events. Auto-Kick."):format(GetPlayerName(src), distinctRecent))
        AC_IsolatePlayer(src)
        DropPlayer(src, "Anticheat: Event-Flood erkannt.")
    end
end

for _, eventName in ipairs(Config.EventRateLimit.monitoredEvents or {}) do
    RegisterNetEvent(eventName)
    AddEventHandler(eventName, function(...) onMonitoredEvent(eventName) end)
end

AddEventHandler("playerDropped", function()
    local src = source
    counts[src] = nil
    floodHits[src] = nil
end)
