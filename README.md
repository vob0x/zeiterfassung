# Zeiterfassung V6.0 – Web & Mobile App

Moderne Zeiterfassungs-App mit React, Supabase und Capacitor. Nachfolger der Single-File PWA V5.15.

## Features (vollständig aus V5.15 übernommen)

- **Parallele Timer**: Bis zu 8 gleichzeitige Task-Slots mit Start/Pause/Stopp
- **Quick-Start Shortcuts**: Auto Top-5 + manuell angepinnte Kombinationen (max. 10)
- **Manueller Eintrag**: Datum, Von/Bis, Stakeholder/Projekt/Tätigkeit, Notiz
- **Einträge-Ansicht**: Filterbarer, sortierbarer Table mit Inline-Edit
- **Dashboard**: KPIs, Stakeholder×Projekt-Heatmap, Tätigkeits-Balken, Zeitverlauf (14 Tage)
- **Stammdaten-Verwaltung**: CRUD für Stakeholder, Projekte, Tätigkeiten
- **Team-Dashboard**: Tagesübersicht, Stakeholder×Person, Projekt×Person, Auslastung, Timeline
- **Team-Sync**: Über Supabase Realtime (ersetzt File System Access API)
- **Backup & Restore**: JSON-Vollbackup, CSV-Export/Import
- **Dark Side Backup (DSB)**: 6-Schichten-Sicherungssystem mit CRC32
- **computeUnionMs**: Überlappende Zeitintervalle korrekt zusammenführen (keine Doppelzählung)
- **i18n**: Deutsch/Französisch (314+ Schlüssel)
- **Themes**: Kingsman Cyberpunk (Dark) + Light Theme
- **Offline-Support**: Service Worker, localStorage-Fallback, Offline-Queue
- **PWA**: Installierbar auf Desktop und Mobile
- **iOS-App**: Via Capacitor

## Neu in V6.0

- **Supabase Backend**: PostgreSQL, Auth, Realtime statt IndexedDB/localStorage
- **Privacy-First Auth**: Pseudonyme Anmeldung (Codename + Passwort, keine E-Mail/Klarnamen)
- **Team-Sync via Cloud**: Invite-Codes statt Netzwerk-Ordner
- **React + TypeScript**: Moderner, wartbarer Tech-Stack
- **Capacitor iOS**: Native iOS-App
- **GitHub Pages Deployment**: Automatisch via GitHub Actions

## Tech Stack

| Schicht | Technologie |
|---------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + CSS Custom Properties |
| State | Zustand (persistiert in localStorage) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Mobile | Capacitor (iOS) |
| Icons | Lucide React |
| Dates | date-fns |
| CI/CD | GitHub Actions → GitHub Pages |

## Schnellstart

### 1. Repository klonen

```bash
git clone https://github.com/DEIN-USERNAME/zeiterfassung-app.git
cd zeiterfassung-app
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Supabase-Projekt einrichten

1. Neues Projekt auf [supabase.com](https://supabase.com) erstellen
2. **SQL Editor** öffnen und den Inhalt von `supabase/migrations/20260322000000_initial.sql` ausführen
3. Unter **Settings → API** die Projekt-URL und den anon-Key kopieren

### 4. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
```

Dann `.env` bearbeiten:
```
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

### 5. Entwicklungsserver starten

```bash
npm run dev
```

Die App läuft auf `http://localhost:5173`

## Supabase-Datenbank

Die Migration (`supabase/migrations/20260322000000_initial.sql`) erstellt:

| Tabelle | Beschreibung |
|---------|-------------|
| `profiles` | Pseudonyme Benutzerprofile (nur Codename) |
| `teams` | Teams mit 6-stelligem Invite-Code |
| `team_members` | Team-Mitgliedschaften |
| `stakeholders` | Stakeholder pro User (mit sort_order) |
| `projects` | Projekte pro User |
| `activities` | Tätigkeiten pro User |
| `time_entries` | Zeiteinträge (date, start/end, duration, notiz) |
| `user_settings` | Theme, Sprache, Pinned Shortcuts |

Alle Tabellen sind mit Row Level Security (RLS) geschützt. Team-Mitglieder können gegenseitig Einträge lesen (nicht ändern).

## iOS-App bauen

### Voraussetzungen
- macOS mit Xcode
- Xcode Command Line Tools

### Schritte

```bash
# 1. Web-App bauen
npm run build

# 2. Capacitor initialisieren (einmalig)
npx cap init "Zeiterfassung" "com.zeiterfassung.app" --web-dir dist

# 3. iOS-Plattform hinzufügen (einmalig)
npx cap add ios

# 4. Web-Assets synchronisieren
npx cap sync ios

# 5. Xcode-Projekt öffnen
npx cap open ios
```

In Xcode: Simulator oder Gerät wählen → Run (Cmd+R).

## GitHub Pages Deployment

1. Repository-Settings → Pages → Source: "GitHub Actions"
2. Repository-Settings → Secrets → folgende Secrets anlegen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Push auf `main` → automatischer Deploy

## Projektstruktur

```
zeiterfassung-app/
├── .github/workflows/     # CI/CD Pipelines
├── public/                # Static assets, PWA manifest, Service Worker
├── supabase/migrations/   # PostgreSQL Schema
├── src/
│   ├── components/
│   │   ├── Auth/          # Login/Register (pseudonym)
│   │   ├── Timer/         # Timer-Ansicht (5 Dateien)
│   │   ├── Entries/       # Einträge-Ansicht (3 Dateien)
│   │   ├── Dashboard/     # Dashboard (5 Dateien)
│   │   ├── Manage/        # Stammdaten + Backup
│   │   ├── Team/          # Team-Dashboard (5 Dateien)
│   │   ├── Settings/      # Einstellungen
│   │   └── UI/            # Modal, Toast, ConfirmDialog
│   ├── stores/            # Zustand Stores (6 Stores)
│   ├── hooks/             # Custom Hooks (Sync, Offline, Keyboard)
│   ├── i18n/              # DE/FR Übersetzungen (314+ Keys)
│   ├── lib/               # Utilities, Auth, Backup, DSB, Supabase
│   └── styles/            # Global CSS + Tailwind
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── capacitor.config.ts
```

## Datenschutz

- **Keine Klarnamen**: Anmeldung nur mit Codename + Passwort
- **Keine E-Mails**: Intern wird `codename@zeiterfassung.local` als Supabase-E-Mail genutzt
- **RLS**: Jeder User sieht nur seine eigenen Daten
- **Team-Zugang**: Nur über Invite-Code (kein E-Mail-Versand)
- **Offline-First**: Daten lokal verfügbar, Cloud-Sync optional

## Migration von V5.15

1. In V5.15: Backup erstellen (Verwaltung → Komplett-Backup)
2. In V6.0: Anmelden, dann Verwaltung → Backup wiederherstellen
3. Alle Einträge, Stammdaten und Shortcuts werden übernommen

## Befehle

```bash
npm run dev       # Entwicklungsserver
npm run build     # Production-Build
npm run preview   # Production-Preview
```
