# 🤖 RP Server Discord Bot

Ein vollständiger Discord Bot für RP Server gebaut mit **discord.js v14** und **MongoDB**.

---

## 📋 Features

| Kategorie | Features |
|-----------|----------|
| 🎫 **Tickets** | Panel mit Dropdown (Support/Highteam/Fraktion/Entbannung), Transcript, Zuweisung, Priorität, Notizen |
| 🎁 **Giveaway** | Start/End/Reroll, Modal mit Preis/Dauer/Gewinner 1-9, grüner Teilnehmen-Button |
| 🏘️ **Fraktionen** | Erstellen (nur Fraktionsverwaltung), Infos, Mitglieder, Events, PLZ, Status |
| 🔨 **Moderation** | Warn, Mute, Kick, Ban, Tempban, Softban, Unban, Clear, Slowmode, Lock/Unlock |
| 🛡️ **Auto-Schutz** | Anti-Spam, Anti-Link, Anti-Raid, Anti-Bot |
| 📝 **Logs** | Join/Leave, Nachrichten, Voice, Rollen, Nicknames, Mod-Aktionen |
| 👥 **Team** | Dienst, Pause, Abmelden, Urlaub, Schichtzeit, Statistiken, Ankündigungen |
| 🎉 **Events** | Erstellen, Teilnehmerliste, Erinnerungen (30min vorher), Countdown |
| 📝 **Bewerbungen** | Modal, Annehmen/Ablehnen/Warteliste, Auto-DM |
| 🗳️ **Abstimmungen** | Live-Balken, anonym, Team-Only, Zeitlimit |
| 🏆 **Belohnungen** | Mitarbeiter des Monats, Punkte-System, Rangliste |
| 🔧 **Utility** | Userinfo, Serverinfo, Avatar, Roleinfo, Ping, Uptime, Help, Embed |

---

## 🚀 Installation

### Voraussetzungen
- [Node.js](https://nodejs.org/) v18 oder höher
- [MongoDB Atlas](https://cloud.mongodb.com/) (kostenlos) oder lokale MongoDB-Instanz
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))

### Schritt 1 — Repository einrichten
```bash
# In den Bot-Ordner wechseln
cd discord-bot

# Dependencies installieren
npm install
```

### Schritt 2 — Konfiguration
```bash
# .env Datei erstellen
cp .env.example .env
```

Öffne `.env` und fülle alle Felder aus:

```env
BOT_TOKEN=dein_token_hier
CLIENT_ID=deine_application_id
GUILD_ID=deine_server_id
MONGO_URI=mongodb+srv://...
```

### Schritt 3 — Discord Developer Portal
1. Gehe zu [discord.com/developers/applications](https://discord.com/developers/applications)
2. Erstelle eine neue Application
3. Unter **Bot**: Token kopieren → in `.env` eintragen
4. Unter **OAuth2 → General**: Application ID kopieren → `CLIENT_ID` in `.env`
5. **Privileged Intents** aktivieren:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
   - ✅ Presence Intent

### Schritt 4 — Bot einladen
Erstelle einen Einladungslink mit folgenden Scopes und Permissions:

**Scopes:** `bot`, `applications.commands`

**Permissions:** `Administrator` (für alle Features) oder einzeln:
- Manage Guild, Manage Channels, Manage Roles
- Kick Members, Ban Members
- Moderate Members (Timeout)
- Read/Send Messages, Embed Links, Attach Files
- View Audit Log

### Schritt 5 — Commands registrieren & Bot starten
```bash
# Slash-Commands registrieren (einmalig oder nach Command-Änderungen)
npm run deploy

# Bot starten
npm start

# Entwicklungsmodus (auto-restart bei Änderungen)
npm run dev
```

---

## ⚙️ Erstkonfiguration im Discord

Nach dem Start des Bots, richte alles mit `/modconfig set` ein:

```
/modconfig set einstellung:Log-Kanal          kanal:#logs
/modconfig set einstellung:Mod-Log-Kanal      kanal:#mod-logs
/modconfig set einstellung:Ticket-Logs        kanal:#ticket-logs
/modconfig set einstellung:Join/Leave-Kanal   kanal:#join-leave
/modconfig set einstellung:Voice-Log-Kanal    kanal:#voice-logs
/modconfig set einstellung:Willkommens-Kanal  kanal:#willkommen
/modconfig set einstellung:Ticket-Kategorie   kanal:[Tickets Kategorie]
```

Features aktivieren:
```
/modconfig toggle feature:Anti-Spam
/modconfig toggle feature:Anti-Raid
/modconfig toggle feature:Willkommen
```

Ticket-Panel senden:
```
/ticket panel
```

---

## 📁 Projektstruktur

```
discord-bot/
├── src/
│   ├── commands/
│   │   ├── applications/    # Bewerbungs-Commands
│   │   ├── events/          # Event-Commands
│   │   ├── fraktion/        # Fraktions-Commands
│   │   ├── giveaway/        # Giveaway-Commands
│   │   ├── moderation/      # Mod-Commands
│   │   ├── team/            # Team-Commands
│   │   └── utility/         # Utility-Commands
│   ├── events/              # Discord-Events (join, message, etc.)
│   ├── handlers/            # Command/Event/Interaction-Handler
│   ├── interactions/
│   │   ├── buttons/         # Button-Handler
│   │   ├── modals/          # Modal-Handler
│   │   └── selects/         # Select-Menu-Handler
│   ├── models/              # MongoDB-Modelle
│   ├── utils/               # Hilfsfunktionen
│   ├── config.js            # Farben, Emojis, Einstellungen
│   ├── index.js             # Einstiegspunkt
│   └── deploy-commands.js   # Commands registrieren
├── .env.example             # Konfigurationsvorlage
├── .env                     # Deine Konfiguration (nicht commiten!)
└── package.json
```

---

## 🗃️ Datenbank-Modelle

| Modell | Beschreibung |
|--------|-------------|
| `GuildConfig` | Server-Einstellungen (Kanäle, Features) |
| `Ticket` | Ticket-Daten, Notizen, Priorität |
| `Warn` | Verwarnungs-Historie |
| `TeamMember` | Dienstzeiten, Statistiken, Urlaub |
| `Fraktion` | Fraktions-Daten, Mitglieder, Events |
| `Giveaway` | Giveaway-Daten, Teilnehmer |
| `Event` | Server-Events, Teilnehmer |
| `Application` | Bewerbungen, Antworten, Status |

---

## 🔒 Sicherheit

- `.env` Datei **niemals** in Git commiten
- `.gitignore` bereits konfiguriert
- Alle sensiblen Daten über Umgebungsvariablen

---

## 📞 Support

Bei Fragen oder Problemen erstelle ein Issue im Repository.
