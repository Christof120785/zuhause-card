# Aufträge für den Pi-Claude (Home Assistant)

Diese Datei ist die Auftragsliste. Neueste Aufträge stehen oben. Jeder Auftrag hat eine ID und einen Status:
`offen` (ausführen), `wartet` (noch nicht ausführen, steht dabei warum) oder `erledigt`.

Regeln für alle Aufträge:
- Mache vorher eine Sicherung, wenn du Dashboards oder Automationen änderst, und sage mir, wo sie liegt.
- Ändere nichts an der Dashboard-Karte custom:zuhause-card (Code liegt in diesem Repo, ihn pflegt der Claude im Haupt-Thread).
- Regeln zwischen Geräten gehören nur in Home-Assistant-Automationen, nie in Hersteller-Apps oder Clouds.
- Schreibe keine Passwörter, Schlüssel oder Adressen in diese Datei oder in dein Ergebnis hier im Repo.
- Wenn du einen Auftrag ausgeführt hast, schreibe die ID in /config/pi-auftraege-erledigt.md (eine Zeile pro ID mit Datum) und sage mir am Ende in zwei bis drei Sätzen, was du gemacht hast und ob ich noch etwas tun muss.

---

## A14 · 2026-11-10 · Warum hat die Zeitschaltung um 06:00 nicht geladen? · Status: erledigt

Christof hat die Zeitschaltung fürs Laden (Startzeit 06:00) benutzt, aber die Wallbox hat um 06:00 nicht geladen; das Auto zeigte „lädt nicht“ (Zeitplan im Auto ist aus). Er hat dann von Hand umgeschaltet. Wallbox und Home Assistant sind erreichbar, es geht nur um die Regel.
1. Prüfe die Automation `zuhause_wallbox_zeitschaltung`: gibt es sie, ist sie an, und was zeigt die Ablaufverfolgung/das Protokoll für heute 06:00 (lief sie, welcher Zweig, welche Bedingung hat sie gestoppt)?
2. Prüfe die Helfer: `input_boolean.zuhause_wallbox_zeit_aktiv` (an?), `input_datetime.zuhause_wallbox_zeit_von` (stand wirklich 06:00?), `input_text.zuhause_wallbox_zeit_tage` (heute Dienstag = 1, ist die 1 enthalten?) und `input_boolean.zuhause_wallbox_zeit_ende_aktiv`.
3. Die Regel startet nur, wenn das Auto als angesteckt erkannt wird (Status Ladevorgang). Prüfe, welchen Text dieser Sensor im angesteckten Zustand hat und ob die Bedingung der Automation das als „verbunden“ erkennt (Bedingung `verb`).
4. Prüfe, ob die Regel die Wallbox wirklich auf „Laden mit Vorgabe“ gestellt hat und ob danach etwas anderes (zum Beispiel `zuhause_wallbox_netzanteil` oder `zuhause_wallbox_pv_nach_abstecken`) sie sofort zurückgestellt hat.
5. Behebe, was in Home Assistant liegt (die Automation darfst du anpassen), und sage mir in drei Sätzen die Ursache. Liegt der Fehler im Karten-Code, beschreibe ihn genau, ändere die Karte nicht.

## A13 · 2026-11-10 · Zeitschaltung hat nicht geladen, „Sofort“ geht nicht, Zugriff über die IP geht nicht · Status: abgebrochen

Christof meldet am Morgen: Die Zeitschaltung fürs Laden (Start 06:00) hat nicht geladen, „Sofort laden“ geht auch nicht, und Home Assistant ist über die IP-Adresse nicht erreichbar. Nachtrag: Mit „IP“ meint Christof die Adresse der Wallbox (SMA EV Charger), nicht die des Pi: Die Wallbox ist über ihre IP nicht erreichbar. Wahrscheinlichste Ursache ist deshalb, dass die Wallbox nicht im Netzwerk war (Strom, WLAN/Kabel, neue IP von der Fritz!Box). Prüfe als Erstes, ob die SMA-Integration die Wallbox erreicht (Entitäten „nicht verfügbar“?), welche IP sie hat und ob die Fritz!Box sie noch als verbunden listet, und ob die Integration auf die alte IP zeigt. Sag Christof, wenn er vor Ort etwas tun muss (Wallbox spannungsfrei machen, Kabel prüfen). Nachtrag 2: Auch die Reolink-Kamera (Haustür) ist nicht erreichbar. Suche eine gemeinsame Ursache von Wallbox und Reolink: gleiches Netzsegment oder WLAN-Zugangspunkt/Repeater/Switch, die Fritz!Box (Geräteliste: welche Geräte sind offline, gibt es Gast- oder Mesh-Probleme), neue IP-Adressen (DHCP), und ob Home Assistant selbst die Geräte noch anpingen kann (zum Beispiel `ping` aus dem Terminal) und die Integrationen auf die richtigen Adressen zeigen. Sage mir, welche Geräte außer diesen beiden noch offline sind, und ob ich etwas vor Ort tun muss (Router, Repeater oder Zugangspunkt neu starten). Vermutlich hängt alles zusammen (Home Assistant war oder ist nicht erreichbar oder neu gestartet).
1. Prüfe zuerst, ob Home Assistant gesund ist: Uptime und letzter Neustart (Protokoll, `ha core info`, `ha host info`), Fehlermeldungen in der Nacht, Netzwerk (hat der Pi noch dieselbe IP und ist er per Kabel/WLAN verbunden), freier Speicher, Temperatur. Gab es ein Update oder einen Absturz? Sage mir die Uhrzeit des letzten Neustarts und die Ursache.
2. Prüfe die Automation `zuhause_wallbox_zeitschaltung`: existiert sie und ist sie an, wann lief sie zuletzt (Protokoll/Ablaufverfolgung), und was ist um 06:00 passiert? Prüfe die Helfer `input_boolean.zuhause_wallbox_zeit_aktiv`, `input_datetime.zuhause_wallbox_zeit_von`/`_bis`, `input_text.zuhause_wallbox_zeit_tage` (Wochentag 0 = Montag) und ob das Auto angesteckt war.
3. Prüfe, warum „Sofort“ nicht geht: Betriebsart-Auswahl der Wallbox, Ladeleistung, Drehschalter an der Wallbox (steht er auf Schnellladen, sperrt er die Umschaltung), Verbindung der Wallbox zu Home Assistant (SMA-Integration erreichbar?).
4. Behebe, was du von Home Assistant aus beheben kannst. Ändere nichts an der Dashboard-Karte.
5. Sage mir am Ende in drei Sätzen die Ursache und ob ich etwas tun muss. Ist der Pi selbst nicht erreichbar, sage mir genau, was ich vor Ort prüfen soll.

## A12 · 2026-11-09 · Wandtaster Wohnzimmer: Umschalten statt nur Einschalten · Status: erledigt

Die Automationen `wandtaster_wohnzimmer_klein` und `wandtaster_wohnzimmer_gross` (aus A11) schalten das Licht nur ein. Christof will es aus- und einschalten können.
1. Ändere beide Automationen so, dass ein kurzer Tastendruck das Licht umschaltet (`light.toggle` statt `light.turn_on`), an beiden Tastern (Esszimmer und Flur).
2. Teste es für beide Lichter und beide Taster: Taste drücken, Licht geht an, Taste nochmal drücken, Licht geht aus.
3. Schalten Hue/Homematic dabei doppelt (Taste löst zwei Mal aus, Licht geht sofort wieder an)? Dann entprelle es (zum Beispiel Modus `single` mit kurzer Wartezeit) und sage mir, was du getan hast.
4. Aktualisiere den Eintrag in /config/wo-ist-was-programmiert.md.

## A11 · 2026-11-09 · Wandtaster: Wohnzimmer-Lichter einschalten · Status: erledigt

Christof hat einen Homematic-Wandtaster mit sechs Tasten (zwei Spalten, drei Reihen, Beschriftung: Esszimmer, Flur, Carport, Carport gesperrt). Zwei Tasten sollen Lichter im Wohnzimmer einschalten:
- Taste Mitte links: Licht „kleines Wohnzimmer“ einschalten.
- Taste unten links: Licht „großes Wohnzimmer“ einschalten.
1. Finde den Taster in Home Assistant (Homematic-Integration, Ereignis- oder Event-Entitäten der Tastenkanäle). Finde heraus, welcher Kanal „Mitte links“ und welcher „unten links“ ist (nummeriert meist zeilenweise von oben links; prüfe es, indem du Christof eine Taste drücken lässt und im Protokoll nachsiehst, welcher Kanal kommt).
2. Finde die passenden Lichter (kleines und großes Wohnzimmer, vermutlich Hue). Passen die Namen nicht eindeutig, frage Christof.
3. Lege pro Taste eine Home-Assistant-Automation an (Kurzer Tastendruck schaltet das Licht ein). Soll ein Druck bei eingeschaltetem Licht ausschalten (umschalten), sage es Christof als Vorschlag, ändere es aber nur, wenn er es will.
4. Prüfe im Homematic-Programm der Zentrale (CCU), ob diese Tasten dort schon etwas auslösen. Wenn ja, sage mir, was; ändere es nicht ohne meine Antwort.
5. Trage die Automationen in /config/wo-ist-was-programmiert.md ein.

## A9 · 2026-11-07 · Flurlicht geht nach dem Ausschalten nicht sofort wieder an · Status: offen

Wenn Christof im Flur unten hoch und runter läuft und das Licht gerade aus ist, geht es bei der nächsten Bewegung nicht sofort wieder an. Er will wissen, wie viel Zeit zwischen Ausschalten und dem nächsten Einschalten vergeht, und sie möglichst klein haben (am liebsten sofort).
1. Finde die Ursache(n) und sage mir pro Ursache, wie viele Sekunden sie kostet:
   - Der Shelly BLU Motion meldet nach einer Bewegung eine gewisse Zeit keine neue (Ruhezeit oder „Blind time“ des Melders). Sieh nach, was an dem Gerät eingestellt ist und ob sich das von Home Assistant aus oder nur in der Shelly-App ändern lässt. Falls nur in der App, sage mir genau, wo ich es einstelle.
   - Die Automation: Modus (`single`, `restart`, …), eine Wartezeit am Ende (zum Beispiel der Nachlauf, der noch läuft, während das Licht schon aus ist), und ob sie auf den Wechsel „aus → an“ des Melders wartet, den es erst nach der Ruhezeit wieder gibt.
2. Behebe, was du von Home Assistant aus beheben kannst. Zum Beispiel: Modus `restart`, damit eine neue Bewegung den Nachlauf neu startet und das Licht sofort wieder an ist.
3. Teste und nenne mir die Zeit, die es jetzt zwischen Aus und erneutem Einschalten dauert.

## A8 · 2026-11-07 · WiZ-Lampen Flur unten: Helligkeit beim Einschalten · Status: offen

Die beiden WiZ-Lampen im Flur unten merken sich die Helligkeit aus der WiZ-App nicht, wenn Home Assistant sie schaltet (sie gehen mit der letzten oder voller Helligkeit an). Gewünscht sind 35 % als Standard.
1. Die Bewegungs-Automation Flur unten setzt beim Einschalten der WiZ-Lampen die Helligkeit auf den Wert des Helfers `input_number.bewegung_flur_unten_helligkeit` (1 bis 100 %, `brightness_pct` im Dienstaufruf `light.turn_on`). Setze den Helfer auf 35.
2. Das gilt nur für das Einschalten durch Bewegung. Schaltet Christof die Lampen von Hand ein, ändert die Automation die Helligkeit nicht.
3. Die Shelly-Steckdose hat keine Helligkeit, dort ändert sich nichts.
Hängt es an A6, mache es zusammen mit A6.

## A7 · 2026-11-07 · Nachlaufzeit in Sekunden · Status: offen

Die Nachlaufzeit des Bewegungslichts Flur unten soll in Sekunden einstellbar sein, 0 bis 120.
1. Ändere den Helfer `input_number.bewegung_flur_unten_nachlauf`: Minimum 0, Maximum 120, Schritt 5, Einheit `s`. Setze den aktuellen Wert auf 60, falls er sonst etwa 1 Minute entspricht.
2. Passe die Bewegungs-Automation Flur unten so an, dass sie den Wert als Sekunden nutzt. Rechne nirgends mehr mit Minuten.
3. Gibt es weitere Helfer `bewegung_*_nachlauf` in anderen Räumen, nenne sie mir und ändere sie nicht ohne meine Antwort.
Teste kurz (Bewegung auslösen, Zeit abwarten).

## A6 · 2026-11-07 · Bewegungsmelder Flur unten steuert Steckdose und WiZ-Lampen · Status: offen

Der Shelly BLU Motion im Flur unten (`binary_sensor.flur_unten_bthome_sensor_62e6_bewegung`) soll die Shelly-Steckdose „Shelly LED Wandlampe Flur unten“ und die beiden WiZ-Lampen im Bereich „Flur unten“ schalten, in einer einzigen Home-Assistant-Automation. Die eigene Bewegungserkennung (SpaceSense) der WiZ-Lampen ist in der WiZ-App schon ausgeschaltet.
1. Bei Bewegung gehen Steckdose und beide WiZ-Lampen an, nach der Nachlaufzeit wieder aus. Nutze die vorhandenen Helfer `bewegung_flur_unten_*` (Hauptschalter, Nachlaufzeit, nur im Dunkeln, Zeitfenster).
2. Schalte ich ein Licht von Hand ein, bleibt es an. Die Automation schaltet nur aus, was sie wegen Bewegung selbst eingeschaltet hat (Kontext der Einschaltung oder ein Merker `input_boolean`).
3. Der Hauptschalter schaltet die ganze Automatik aus (Aus = nichts ein, nichts aus).
4. Alte oder doppelte Regeln für dieses Licht nennst du mir, bevor du sie löschst.
Teste kurz (Bewegung, Handschaltung, Hauptschalter aus).

## A5 · 2026-11-07 · Dashboard-Seiten oben in der Leiste · Status: offen

Lege im bestehenden Dashboard (Karte `custom:zuhause-card`) vier Seiten (Views) an. Jede ohne Titel, nur mit Symbol, Vollbild-Layout (`panel: true`), mit genau einer Karte `custom:zuhause-card` und sonst nichts. Falls es schon welche aus früheren Aufträgen gibt, ändere sie nach dieser Liste. Platziere sie neben dem Haus- und dem Fernseher-Symbol.
1. Pfad `raeume`, Symbol `mdi:sofa`, in der Karte `page: raeume`
2. Pfad `kameras`, Symbol `mdi:cctv`, in der Karte `page: kameras`
3. Pfad `haushalt`, Symbol `mdi:washing-machine`, in der Karte `page: geraete`
4. Pfad `energie`, Symbol `mdi:lightning-bolt`, in der Karte `page: energie`
Eine Seite „saugroboter“ gibt es nicht mehr, der Roboter steckt in Seite 3. Übernimm alle anderen Einstellungen der bestehenden Karte unverändert, die vorhandenen Seiten (Haus, Fernseher) änderst du nicht.

## A4 · 2026-11-07 · Solar zuerst: Batterie oder Auto · Status: offen

Der Schalter `input_boolean.zuhause_solar_prioritaet_auto` (aus = Batterie zuerst, an = Auto zuerst) existiert, tut aber noch nichts. Baue die Regel als Automation und halte dich an die bestehende Wallbox-Regelung (Automation „Wallbox PV-Laden mit Netzanteil“ nicht ändern, ohne mir vorher zu sagen, was):
- Der Anker-Hausspeicher soll nachts voll sein, aber er darf nicht ans Auto abgeben, wenn der Schalter aus ist.
- Aus: Die Sonne lädt zuerst den Anker, nur der Rest geht ins Auto.
- An: Das Auto bekommt den Sonnenüberschuss zuerst, der Anker lädt mit dem Rest.
- Ist das Auto nicht angesteckt, lädt immer der Anker.
Prüfe, ob sich die Ladeleistung des Ankers dafür steuern lässt, und sage mir, falls nicht.

## A3 · 2026-11-07 · Speicher nicht entladen · Status: offen

Der Schalter `input_boolean.zuhause_anker_entladen_sperren` existiert, tut aber noch nichts. Solange er an ist, soll der Anker-Speicher nichts ans Haus abgeben und nur laden, genau wie bei der bestehenden Automation „Hausakku lädt das Auto nicht“ (Betriebsmodus benutzerdefiniert, Leistungssteuerung 0 W, danach zurück in den vorherigen Modus). Nutze dasselbe Verfahren und denselben Merker `input_text.zuhause_anker_modus_vorher`, damit sich beide Regeln nicht in die Quere kommen. Ist der Schalter aus und lädt das Auto nicht, läuft alles wie vorher.

## A2 · 2026-11-07 · Waschmaschine über Home Connect · Status: wartet

Wartet, bis die Siemens-Waschmaschine da und in der Home-Connect-App angemeldet ist (nächste Woche). Dann: Binde sie über die eingebaute Home-Connect-Integration ein und schreibe mir eine Liste aller Einträge mit Name und aktuellem Wert. Das Home-Connect-Konto hat Christof schon.

## A10 · 2026-11-08 · Zweite Shelly-Steckdose am 3D-Drucker, nur zur Energiemessung · Status: erledigt

Umbenannt in „Strommessung 3D Drucker“, Bereich Büro. Einträge: `sensor.strommessung_3d_drucker_leistung`, `sensor.strommessung_3d_drucker_energie`, `sensor.drucker_energie_heute`, `sensor.drucker_energie_monat`, Schalter `switch.strommessung_3d_drucker` (ausgeblendet, nur messen).

## A1 · 2026-11-07 · Trockner über ConnectLife · Status: erledigt

Trockner ist eingebunden (45 Einträge im Bereich „Waschküche“).
