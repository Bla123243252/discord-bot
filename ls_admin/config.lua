Config = {}

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  LS ADMIN - Konfiguration                                         ║
-- ╠══════════════════════════════════════════════════════════════════╣
-- ║  Rollen = ESX-Gruppe (users.group) + ACE (siehe server.cfg)       ║
-- ║  Menü-Taste: frei in FiveM > Einstellungen > Tastenbelegung       ║
-- ║              (Standard F7) -> RegisterKeyMapping "ls_admin_menu"   ║
-- ╚══════════════════════════════════════════════════════════════════╝

Config.DefaultKey = "F7"            -- Standard-Taste (in FiveM rebindbar)
Config.MenuTitle = "ADMIN MENU"
Config.Locale = "de"

-- ADuty direkt per Taste togglen (rebindbar) -> RegisterKeyMapping "ls_admin_aduty"
Config.AdutyKey = "X"

-- Noclip direkt per Taste togglen (rebindbar) -> RegisterKeyMapping "ls_admin_noclip"
-- "" = standardmäßig KEINE Taste; jeder bindet sie selbst in FiveM > Einstellungen > Tastenbelegung > FiveM
Config.NoclipKey = "Y"

-- /calladmin: Sekunden Cooldown zwischen zwei Hilferufen (Spam-Schutz)
Config.CallAdminCooldown = 60
-- Reichweite, in der der Name über On-Duty-Admins gezeichnet wird (sehen ALLE Spieler)
Config.AdutyTagDistance = 0.0

-- Reichweite, in der Nametags über Spielern gezeichnet werden (txAdmin-Standard = 150)
Config.NametagDistance = 0.0

-- Gruppen, die das TROLL-Menü sehen dürfen (bewusst NUR Owner).
-- Hier weitere Gruppen eintragen, wenn gewünscht (z.B. ["projektleitung"] = true).
Config.TrollGroups = {
    ["projektleitung"] = true,
}

-- Gruppen, die den "Fraktionsleitung"-Tab (inkl. Fraktionsleitung-Ansage) sehen/nutzen dürfen.
-- NUR diese Gruppen sehen den Tab. Weitere hier ergänzen, falls gewünscht.
Config.FactionLeadGroups = {
    ["fraktionsleitung"] = true,
    ["projektleitung"]   = true,
}

-- ┌─ Berechtigungen ───────────────────────────────────────────────────┐
-- │  "*"            = alle Rechte                                        │
-- │  "self.*"       = alle Self-Rechte                                   │
-- │  einzeln        = "self.god", "vehicle.fix", "players.kick" ...      │
-- └────────────────────────────────────────────────────────────────────┘
local ALL = { "*" }

-- ┌─ Rollen ───────────────────────────────────────────────────────────┐
-- │  key   = ESX-Gruppenname (kleinschreibung, = users.group)           │
-- │  label = Anzeigename (Menü + Nametag)                               │
-- │  level = Rang-Höhe (höher = höher gestellt)                         │
-- │  color = {r,g,b} für Nametag + Admin-Anzug                          │
-- │  menu  = hat Zugriff aufs Admin-Menü?                               │
-- │  perms = Rechte-Liste                                                │
-- │  suitTex = Textur-Variante des Anzugs (Farbe, ggf. anpassen)         │
-- └────────────────────────────────────────────────────────────────────┘
-- ┌─ Rechte-Aufteilung (welche Rolle sieht welchen Tab) ───────────────┐
-- │  Tabs & benötigte Rechte:                                           │
-- │   Admin (ADuty/Nametags/Noclip) .. "aduty" / "nametags" / "self.noclip"
-- │   Fahrzeug Menü .................. "vehicle.*"  (oder einzelne)      │
-- │   Spieler Online ................ "players.*"  (oder einzelne)      │
-- │   Event Menü .................... "event.*"   -> NUR Eventleitung    │
-- │   Rückerstattung ................ "refund.*"                         │
-- │   Fraktionsleitung .............. Config.FactionLeadGroups (oben)    │
-- │   Boss Menü ..................... "boss"                             │
-- │   Troll Menü .................... Config.TrollGroups (Owner)         │
-- └────────────────────────────────────────────────────────────────────┘
Config.Roles = {
    -- ═══ VOLLZUGRIFF (alles) ══════════════════════════════════════════
    ["owner"]             = { label = "Owner",               level = 101, color = {255, 0, 0},     menu = true,  perms = ALL, suitTex = 2 },
    ["admin"]             = { label = "Admin",               level = 95,  color = {255, 0, 0},     menu = true,  perms = ALL, suitTex = 2 },
    ["projektleitung"]    = { label = "Projektleitung",      level = 100, color = {255, 0, 0},     menu = true,  perms = ALL, suitTex = 2 },
    ["stvprojektleitung"] = { label = "Stv. Projektleitung", level = 99,  color = {220, 0, 0},     menu = true,  perms = ALL, suitTex = 2 },

    -- ═══ MANAGEMENT (alles außer Event/Faction/Troll) + Boss ══════════
    ["management"]        = { label = "Management",          level = 90,  color = {255, 140, 0},   menu = true,  perms = { "self.noclip", "vehicle.*", "players.*", "refund.*", "boss", "aduty", "nametags" }, suitTex = 0 },
    ["stvmanagement"]     = { label = "Stv. Management",     level = 88,  color = {255, 165, 40},  menu = true,  perms = { "self.noclip", "vehicle.*", "players.*", "refund.*", "boss", "aduty", "nametags" }, suitTex = 0 },

    -- ═══ TEAMLEITUNG (Fahrzeug/Spieler/Rückerstattung) ════════════════
    ["teamleitung"]       = { label = "Teamleitung",         level = 80,  color = {255, 215, 0},   menu = true,  perms = { "self.noclip", "vehicle.*", "players.*", "refund.*", "aduty", "nametags" }, suitTex = 1 },
    ["stvteamleitung"]    = { label = "Stv. Teamleitung",    level = 78,  color = {230, 200, 60},  menu = true,  perms = { "self.noclip", "vehicle.*", "players.*", "refund.*", "aduty", "nametags" }, suitTex = 1 },

    -- ═══ ADMINISTRATION (Fahrzeug/Spieler, KEINE Rückerstattung) ══════
    ["superadministrator"]= { label = "Superadministrator",  level = 70,  color = {138, 43, 226},  menu = true,  perms = { "self.noclip", "vehicle.*", "players.*", "aduty", "nametags" }, suitTex = 10 },
    ["administrator"]     = { label = "Administrator",       level = 60,  color = {160, 90, 230},  menu = true,  perms = { "self.noclip", "vehicle.*", "players.*", "aduty", "nametags" }, suitTex = 10 },

    -- ═══ MODERATION (Spieler-Aktionen, eingeschränkt) ═════════════════
    ["headmoderator"]     = { label = "Head Moderator",      level = 50,  color = {0, 120, 255},   menu = true,  perms = { "self.noclip", "vehicle.fix", "players.goto", "players.bring", "players.freeze", "players.spectate", "players.heal", "players.revive", "players.kick", "aduty", "nametags" }, suitTex = 4 },
    ["moderator"]         = { label = "Moderator",           level = 45,  color = {40, 150, 255},  menu = true,  perms = { "self.noclip", "players.goto", "players.bring", "players.freeze", "players.spectate", "players.revive", "aduty", "nametags" }, suitTex = 4 },
    ["testmoderator"]     = { label = "Test Moderator",      level = 40,  color = {120, 190, 255}, menu = true,  perms = { "self.noclip", "players.goto", "players.spectate", "players.freeze", "aduty", "nametags" }, suitTex = 4 },

    -- ═══ SUPPORT (NUR: Wiederbeleben, Nametags, ADuty, Noclip) ════════
    ["support"]           = { label = "Supporter",           level = 30,  color = {40, 220, 140},  menu = true,  perms = { "self.noclip", "players.revive", "aduty", "nametags" }, suitTex = 5 },
    ["headsupporter"]     = { label = "Head Supporter",      level = 35,  color = {0, 200, 120},   menu = true,  perms = { "self.noclip", "players.revive", "aduty", "nametags" }, suitTex = 5 },
    ["supporter"]         = { label = "Supporter",           level = 30,  color = {40, 220, 140},  menu = true,  perms = { "self.noclip", "players.revive", "aduty", "nametags" }, suitTex = 5 },
    ["testsupporter"]     = { label = "Test Supporter",      level = 25,  color = {130, 230, 180}, menu = true,  perms = { "self.noclip", "players.revive", "aduty", "nametags" }, suitTex = 5 },

    -- ═══ ANALYSE (nur Zuschauen + Nametags) ═══════════════════════════
    ["analystleitung"]    = { label = "Analyst Leitung",     level = 52,  color = {0, 200, 200},   menu = true,  perms = { "self.noclip", "players.goto", "players.spectate", "aduty", "nametags" }, suitTex = 11 },
    ["headanalyst"]       = { label = "Head Analyst",        level = 42,  color = {80, 220, 220},  menu = true,  perms = { "self.noclip", "players.goto", "players.spectate", "aduty", "nametags" }, suitTex = 11 },
    ["analyst"]           = { label = "Analyst",             level = 38,  color = {120, 230, 230}, menu = true,  perms = { "self.noclip", "aduty", "nametags" }, suitTex = 11 },

    -- ═══ EVENT (NUR diese Rolle sieht den Event-Tab) ══════════════════
    ["eventleitung"]      = { label = "Eventleitung",        level = 50,  color = {255, 0, 200},   menu = true,  perms = { "self.noclip", "vehicle.*", "event.*", "players.goto", "players.bring", "aduty", "nametags" }, suitTex = 9 },

    -- ═══ FRAKTIONSLEITUNG (alles außer Boss & Troll) ══════════════════
    ["fraktionsleitung"]  = { label = "Fraktionsleitung",    level = 85,  color = {0, 170, 255},   menu = true,  perms = { "self.noclip", "vehicle.*", "players.*", "event.*", "refund.*", "faction.*", "aduty", "nametags" }, suitTex = 12 },

    -- ═══ CREATOR (KEIN F7-Menü; nutzt das eigene /creatormenu NUI) ════
    ["creator"]           = { label = "Creator",             level = 20,  color = {255, 255, 255}, menu = false, perms = { "self.noclip", "aduty", "nametags" }, suitTex = 7 },

    -- ─── Ohne Admin-Menü ──────────────────────────────────────────────
    -- VIP: menu = false (KEIN hasMenu -> kein Teamchat//revive/Reportpanel!),
    -- aber "nametags"-Recht -> F7 öffnet das Mini-Menü (nur Nametags an/aus).
    ["vip"]               = { label = "VIP",                 level = 5,   color = {255, 215, 0},   menu = false, perms = { "nametags" } },
    -- ⚠️ "creator" hier NICHT nochmal definieren – die Rolle steht oben (mit aduty/nametags/noclip).
    -- Ein doppelter Key überschreibt in Lua den ersten Eintrag (hatte dem Creator alle Rechte genommen)!
}

-- ┌─ Admin-Anzug (ADuty) ──────────────────────────────────────────────┐
-- │  Wird beim ADuty-AN angezogen, beim AUS wird das alte Outfit        │
-- │  wiederhergestellt. Komponenten ggf. an euren Ped anpassen.         │
-- │  Die FARBE kommt aus role.suitTex (Textur-Variante).                │
-- └────────────────────────────────────────────────────────────────────┘
Config.AdminSuit = {
    enabled = true,
    male = {   -- mp_m_freemode_01
        [1]  = { drawable = 135, texture = 0 },  -- Maske
        [3]  = { drawable = 3,   texture = 0 },  -- Arme/Torso
        [4]  = { drawable = 114, texture = 0 },  -- Hose
        [6]  = { drawable = 78,  texture = 0 },  -- Schuhe
        [8]  = { drawable = 15,  texture = 0 },  -- Unterhemd/T-Shirt
        [11] = { drawable = 287, texture = 0 },  -- Oberteil/Torso (Farbe via suitTex überschrieben)
    },
    female = {  -- mp_f_freemode_01
        [1]  = { drawable = 135, texture = 0 },  -- Maske
        [3]  = { drawable = 3,   texture = 0 },  -- Arme/Torso
        [4]  = { drawable = 114, texture = 0 },  -- Hose
        [6]  = { drawable = 78,  texture = 0 },  -- Schuhe
        [8]  = { drawable = 15,  texture = 0 },  -- Unterhemd/T-Shirt
        [11] = { drawable = 287, texture = 0 },  -- Oberteil/Torso (Farbe via suitTex überschrieben)
    },
}
