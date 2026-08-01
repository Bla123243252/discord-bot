Config = {}

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  ZENITH MEDIC DISPATCH - Konfiguration                           ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Erlaubte Jobs (nur diese können /medic nutzen)
Config.AllowedJobs = {
    ['ambulance']    = true,
    ['doctor']       = true,
    ['chief_doctor'] = true,
    ['boss']         = true,
}

-- Job-Name für Berechtigungsprüfung
Config.MedicJob = 'ambulance'

-- Blip auf der Karte für bewusstlose Spieler
Config.Blip = {
    Sprite = 153,    -- Totenkopf
    Color  = 1,      -- Rot
    Scale  = 0.9,
    Label  = 'Bewusstloser Patient',
}

-- Marker beim Patienten
Config.Marker = {
    type = 27,       -- Vertikaler Zylinder
    r    = 255,
    g    = 0,
    b    = 0,
    a    = 120,
    size = 1.0,
}

-- Discord Webhook für Logs (leer lassen = kein Log)
Config.Webhook = ''

-- Automatisch Dispatch senden wenn jemand bewusstlos wird?
Config.AutoDispatch = true

-- Nachricht die der Bewusstlose im Chat sieht
Config.DeadMessage = '~r~Du bist bewusstlos! Warte auf einen Sanitäter...'
