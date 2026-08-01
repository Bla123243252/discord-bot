Radio = {}

-- Gesperrte Kanäle (nur bestimmte Jobs dürfen diese Frequenzen nutzen)
Radio.LockedChannels = {
    { frq = 1, jobs = { "police" } },
    { frq = 2, jobs = { "ambulance" } },
    { frq = 3, jobs = { "police", "ambulance" } },
}

-- Item benötigt um Funk zu nutzen?
Radio.NeedItem = false
Radio.Item = "radio"

-- Standard-Lautstärke (0–100)
Radio.DefaultVolume = 80

-- Maximale Frequenz
Radio.MaxFrequency = 999.99

-- Automatisch Funk verlassen wenn tot?
-- (wird von roadphone Config.RemoveFromRadioWhenDead gesteuert)
