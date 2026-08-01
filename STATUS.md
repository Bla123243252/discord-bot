# Projekt-Status

Stand: 2026-07-27

> Dieses Repo enthält den Discord-Bot (`src/`) **und** mehrere FiveM-Lua-Ressourcen, die hier nur zum Bearbeiten reinliegen (werden separat auf den FiveM-Server kopiert). Die Ressourcen sind aktuell **nicht committed** (siehe Git-Hinweis unten).

## ⚠️ Achtung: kein Git-Repository mehr aktiv

Der `.git`-Ordner im Projekt existiert gerade nicht mehr (`git status` meldet "not a git repository"). Damit gibt es **keine Versionshistorie / kein Backup** über Git für den aktuellen Stand – alle Änderungen liegen nur auf der Platte. Falls das nicht beabsichtigt ist: mit `git init` (+ ggf. `git remote add origin ...`) neu aufsetzen, bevor größere Änderungen gemacht werden.

## Ressourcen-Übersicht

| Ressource | Vorhanden? | Kurzstatus |
|---|---|---|
| `hud` | ✅ | HUD (Zeit/Datum/Job/Location/Hunger/Durst/Speedo/Voice/Geld). Icons + NUI-Fokus-Bug behoben (siehe unten). |
| `ls_shops` | ✅ | Shop-NUI komplett neu gebaut (Grid + Warenkorb), server-seitiger Multi-Item-Checkout. |
| `lb-phone` | ✅ | Kommerzielle Phone-Ressource (2.8.0), unverändert. |
| `lb-apps` | ✅ | Zugehörige lb-phone Apps, unverändert. |
| `ls_admin` | ✅ | Admin-Menü über `hex_menu_api` (externe Dependency, nicht in diesem Repo). Backspace/ESC-Fix verifiziert vorhanden (`popPage()`/`closeMenu()` in `client/main.lua`). |
| `ls_personalmenu` | ✅ | F5-Menü über `hex_menu_api`. Backspace/ESC-Fix verifiziert vorhanden (`pageStack`/`closeMenu()` in `client.lua`). |

## Erledigt in dieser Session

- **hud**: kaputte Font-Awesome-CDN-URL (`site-assets.fontawesome.com`, 403) ersetzt → Icons (Uhr, Kalender, Wallet, Hunger/Durst, Job, Funk, Speedo …) werden wieder geladen.
- **hud**: `SetNuiFocus`-Leak behoben – Edit-Mode (`/settings`) und Emote-Menü geben den NUI-Fokus jetzt auch dann frei, wenn die Ressource neu gestartet wird während das Menü offen war (`onResourceStop`-Handler ergänzt). Vermuteter Auslöser für die lb-phone-Meldung `"Not opening the phone as another script has NUI focus"`.
- **hud**: doppelt registrierten (und damit toten) `close`-NUI-Callback entfernt/gemerged.
- **ls_admin / ls_personalmenu** *(Stand vor dem Verschwinden der Ordner)*: Backspace/ESC schloss das Menü auf der Root-Seite nicht wirklich – `rageClose` wurde nie aufgerufen, nur der interne Lua-Status gesetzt. Fix ergänzt (`closeMenu()` bei leerem `pageStack`).
- **ls_shops**: NUI komplett neu gestaltet nach Vorlage (Grid-Sortiment mit Suche/Kategorien Alle/Essen/Trinken/Items + separates Warenkorb-Panel), Branding **ZENITH ROLEPLAY**, Akzentfarbe grau (ursprünglich Gold). Server validiert Warenkorb jetzt komplett selbst (Preis, Tragfähigkeit, Kontostand) und bucht wahlweise von Wallet oder Bank ab.

## Offen / unbestätigt

- **adhesive.dll-Crash**: clientseitiges FiveM-Problem, nicht code-bezogen. Troubleshooting-Schritte wurden genannt (Overlays deaktivieren, Cache leeren, Treiber/Redistributables aktualisieren, ggf. neu installieren) – Rückmeldung steht noch aus, ob es das war.
- **lb-phone "another script has NUI focus"**: Ursache vermutlich der oben behobene hud-Fokus-Leak. Falls der Fokus schon vor dem Fix hängengeblieben war, hilft der Code erst nach einem Reconnect/Ressourcen-Neustart – noch nicht vom User bestätigt, dass es jetzt geht.
- **ls_admin / ls_personalmenu fehlen** auf der Platte – müssen wieder reingelegt werden, falls weiter daran gearbeitet werden soll.
