Config = {}

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  LS ANTICHEAT - Konfiguration                                     ║
-- ╠══════════════════════════════════════════════════════════════════╣
-- ║  Prinzip: serverautoritative Prüfungen zuerst (Ban/Kick/DB),      ║
-- ║  Erkennung defaultmäßig konservativ (loggen statt sofort bannen). ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Discord-Webhook-URLs (leer lassen = deaktiviert). Eigenständig, unabhängig
-- von hud's "bfs_menus"-Export.
Config.Webhooks = {
    flags = "", -- high/critical Flags
    bans  = "", -- Ban/Kick/Unban-Aktionen
}

Config.Ban = {
    discordAppealUrl = "", -- z.B. Discord-Invite/Ticket-Kanal für Einsprüche
    -- Eigene, isolierte Routing-Bucket-ID. Sobald ein Bann/Auto-Kick ausgelöst
    -- wird, wird der Spieler SOFORT (vor dem eigentlichen Kick/DB-Eintrag) in
    -- diesen Bucket verschoben - sieht dort niemanden mehr, kann niemandem
    -- mehr schaden, egal ob der eigentliche Drop noch minimal verzögert ist.
    -- Hoch genug wählen, damit es keine echte Interior/Instance-ID trifft.
    isolationBucket = 999900,
}

-- Fallback-Rechteprüfung, falls ls_admin nicht läuft (sonst wird
-- exports['ls_admin']:canDo(src, 'anticheat.*') genutzt).
Config.AdminGroups = {
    ["owner"]             = true,
    ["projektleitung"]    = true,
    ["stvprojektleitung"] = true,
    ["admin"]             = true,
}

-- ESX-Gruppen, die von ALLEN Anticheat-Checks automatisch ausgenommen sind
-- (kein Flag, kein Kick, keine DB-Eintragung) - z.B. damit Staff beim
-- Testen/Noclippen/Teleportieren (self.noclip/players.goto aus ls_admin)
-- nicht selbst gekickt wird. 1:1 aus ls_admin/config.lua Config.Roles
-- übernommen - JEDE Gruppe außer "vip" (VIP ist kein Staff-Rang, hat kein
-- Noclip/Goto und bleibt daher regulär vom Anticheat erfasst).
Config.BypassGroups = {
    ["owner"]              = true,
    ["admin"]              = true,
    ["projektleitung"]     = true,
    ["stvprojektleitung"]  = true,
    ["management"]         = true,
    ["stvmanagement"]      = true,
    ["teamleitung"]        = true,
    ["stvteamleitung"]     = true,
    ["superadministrator"] = true,
    ["administrator"]      = true,
    ["headmoderator"]      = true,
    ["moderator"]          = true,
    ["testmoderator"]      = true,
    ["support"]            = true,
    ["headsupporter"]      = true,
    ["supporter"]          = true,
    ["testsupporter"]      = true,
    ["analystleitung"]     = true,
    ["headanalyst"]        = true,
    ["analyst"]            = true,
    ["eventleitung"]       = true,
    ["fraktionsleitung"]   = true,
    ["creator"]            = true,
}

-- ┌─ Bewegungs-Überwachung ─────────────────────────────────────────────┐
Config.Movement = {
    pollIntervalMs           = 1000, -- wie oft die Position pro Spieler geprüft wird
    maxSpeedOnFoot           = 12.0, -- m/s, mit Sprint/Buffs Luft nach oben
    maxSpeedInVehicle        = 130.0,
    maxSpeedFalling          = 60.0,
    teleportHardKickDistance = 150.0, -- Einzeltick-Sprung darüber = eindeutig, Auto-Kick
    graceMsAfterSpawnOrTP    = 3000,  -- Gnadenfrist nach Spawn/Teleport/Fahrzeugwechsel
    violationsBeforeKick     = 5,     -- weiche Verstöße im Fenster bis Auto-Kick
    violationWindowMs        = 60000,
}

-- ┌─ Event-Flood-Schutz ────────────────────────────────────────────────┐
Config.EventRateLimit = {
    defaultMaxPerSecond = 10,
    defaultMaxPerMinute = 120,
    floodKickThreshold  = 3, -- Anzahl verschiedener Events gleichzeitig geflutet -> Auto-Kick
    -- Pro-Event-Overrides, z.B. ["ls_shops:checkout"] = { perSecond = 2, perMinute = 20 },
    perEvent = {},
    -- Events, die ls_anticheat zusätzlich mitzählt (Beobachter-Handler,
    -- kein Ersatz für serverseitige Validierung im jeweiligen Resource-Code).
    -- Hier gezielt sensible/teure Events eintragen, z.B. "ls_shops:checkout".
    monitoredEvents = {
        "ls_shops:checkout",
    },
}

-- ┌─ Resource-Whitelist ────────────────────────────────────────────────┐
Config.ResourceGuard = {
    reportIntervalMs = 30000,
    enforceKick      = false, -- erst nach Testphase ohne False-Positives auf true stellen
}
Config.ResourceWhitelist = {
    "es_extended", "oxmysql", "hex_menu_api",
    "ls_admin", "ls_personalmenu", "ls_shops", "hud", "ls_anticheat",
    -- vollständige Liste mit server.cfg abgleichen
}

-- ┌─ Heartbeat (erkennt eingefrorenes/gekilltes Client-Script) ─────────┐
Config.Heartbeat = {
    intervalMs = 15000,
    graceMs    = 45000,
}
