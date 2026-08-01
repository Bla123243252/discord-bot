-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  LS PERSONAL-MENÜ - Config                                         ║
-- ║  F5 -> Ausweis/Lizenzen, Geld, Fahrzeuge, Kleidung, VIP           ║
-- ║  (esx_property wurde von F5 auf unbelegt umgelegt)                ║
-- ╚══════════════════════════════════════════════════════════════════╝
Config = {}

-- Standard-Taste (RegisterKeyMapping -> in den FiveM-Einstellungen rebindbar)
Config.DefaultKey = "F5"

-- Diese ESX-Gruppen gelten als VIP (users.group)
Config.VipGroups = {
    ["vip"] = true,
}

-- Stadt auf dem Ausweis
Config.IdCity = "ZENITH ROLEPLAY"

-- Visum-Stufen Labels (für Personalmenu-Anzeige)
Config.Stufen = {
    [1] = { label = "Visum 1", description = "Einreise erlaubt." },
    [2] = { label = "Visum 2", description = "Darf am Stadtleben teilnehmen." },
    [3] = { label = "Visum 3", description = "Darf Waffen tragen und kaempfen." },
    [4] = { label = "Visum 4", description = "Erweiterte Rechte." },
    [5] = { label = "Visum 5", description = "Volle Buergerrechte. Darf Fraktionen beitreten." },
}

-- ── Einstellungen-Tab ───────────────────────────────────────────────
-- Killeffekt: Farbe des nativen Kill-Kreuzes (rotes X beim Töten).
-- "standard" = GTA-Rot, nichts wird umgefärbt. Kein eigener Punkt mehr!
Config.KilldotColors = {
    { key = "standard", label = "Standard (Rot)" },
    { key = "weiss", label = "Weiß",   rgb = { 255, 255, 255 } },
    { key = "gruen", label = "Grün",   rgb = { 46, 204, 113 } },
    { key = "blau",  label = "Blau",   rgb = { 52, 152, 219 } },
    { key = "pink",  label = "Pink",   rgb = { 255, 105, 180 } },
    { key = "gelb",  label = "Gelb",   rgb = { 241, 196, 15 } },
    { key = "lila",  label = "Lila",   rgb = { 155, 89, 182 } },
    { key = "cyan",  label = "Cyan",   rgb = { 0, 229, 255 } },
}
