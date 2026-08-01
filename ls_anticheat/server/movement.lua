-- Serverautoritative Bewegungsprüfung: Distanz/Zeit pro Poll vs. plausible
-- Höchstgeschwindigkeit. Harter Einzeltick-Sprung = eindeutig -> Auto-Kick.
-- Weiche Überschreitungen sammeln sich zu einem Kick, nie zu einem Auto-Ban.

local lastCoords = {}   -- [src] = vector3
local lastCheckAt = {}  -- [src] = os.clock() ms
local graceUntil = {}   -- [src] = os epoch ms, Bewegung wird bis dahin ignoriert
local violations = {}   -- [src] = { {t=ms}, ... }

local function nowMs() return GetGameTimer() end

local function grace(src)
    graceUntil[src] = nowMs() + Config.Movement.graceMsAfterSpawnOrTP
end

AddEventHandler("playerSpawned", function() grace(source) end)
AddEventHandler("esx:playerSpawned", function(playerId) grace(playerId) end)
AddEventHandler("esx:enteredVehicle", function() grace(source) end)
AddEventHandler("esx:exitedVehicle", function() grace(source) end)

local function dist(a, b)
    local dx, dy, dz = a.x - b.x, a.y - b.y, a.z - b.z
    return math.sqrt(dx * dx + dy * dy + dz * dz)
end

local function pruneAndCount(src, windowMs)
    local list = violations[src] or {}
    local cutoff = nowMs() - windowMs
    local kept = {}
    for _, v in ipairs(list) do
        if v.t >= cutoff then kept[#kept + 1] = v end
    end
    violations[src] = kept
    return #kept
end

local function recordViolation(src)
    violations[src] = violations[src] or {}
    table.insert(violations[src], { t = nowMs() })
    return pruneAndCount(src, Config.Movement.violationWindowMs)
end

CreateThread(function()
    while true do
        Wait(Config.Movement.pollIntervalMs)
        for _, src in ipairs(GetPlayers()) do
            src = tonumber(src)
            local ped = GetPlayerPed(src)
            if ped and ped ~= 0 and not AC_IsBypassed(src) then
                local coords = GetEntityCoords(ped)
                local prev = lastCoords[src]
                local prevAt = lastCheckAt[src]
                lastCoords[src] = coords
                lastCheckAt[src] = nowMs()

                if prev and prevAt and (not graceUntil[src] or nowMs() > graceUntil[src]) then
                    local elapsedS = (nowMs() - prevAt) / 1000
                    if elapsedS > 0 then
                        local d = dist(prev, coords)
                        local speed = d / elapsedS
                        local license = AC_GetIdentifiers(src)

                        if d > Config.Movement.teleportHardKickDistance and not AC_IsWhitelisted(license, "movement") then
                            AC_InsertFlag(license, GetPlayerName(src), "movement", "critical",
                                { distance = d, elapsedS = elapsedS }, ("%.1f,%.1f,%.1f"):format(coords.x, coords.y, coords.z), "kicked")
                            AC_AlertFlag("Teleport-Verdacht", ("**%s** sprang %.0fm in %.1fs. Auto-Kick."):format(GetPlayerName(src), d, elapsedS))
                            AC_IsolatePlayer(src)
                            DropPlayer(src, "Anticheat: unplausible Bewegung erkannt.")
                        elseif not AC_IsWhitelisted(license, "movement") then
                            local ped2 = GetPlayerPed(src)
                            local inVehicle = IsPedInAnyVehicle(ped2, false)
                            local isFalling = IsPedFalling(ped2) or IsPedRagdoll(ped2)
                            local cap = Config.Movement.maxSpeedOnFoot
                            if inVehicle then cap = Config.Movement.maxSpeedInVehicle
                            elseif isFalling then cap = Config.Movement.maxSpeedFalling end

                            if speed > cap then
                                AC_InsertFlag(license, GetPlayerName(src), "movement", "warn",
                                    { speed = speed, cap = cap, inVehicle = inVehicle },
                                    ("%.1f,%.1f,%.1f"):format(coords.x, coords.y, coords.z), "none")

                                local count = recordViolation(src)
                                if count >= Config.Movement.violationsBeforeKick then
                                    AC_AlertFlag("Wiederholte Speed-Verstöße", ("**%s** überschritt %d mal das Speed-Limit im Zeitfenster. Auto-Kick."):format(GetPlayerName(src), count))
                                    AC_IsolatePlayer(src)
                                    DropPlayer(src, "Anticheat: wiederholte unplausible Geschwindigkeit.")
                                end
                            end
                        end
                    end
                end
            end
        end
    end
end)

AddEventHandler("playerDropped", function()
    local src = source
    lastCoords[src] = nil
    lastCheckAt[src] = nil
    graceUntil[src] = nil
    violations[src] = nil
end)
