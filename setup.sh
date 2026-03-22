#!/bin/bash
# ============================================================
# ZEITERFASSUNG V6.0 – Automatisches Setup & Deploy
# ============================================================
# Dieses Script macht ALLES:
# 1. Dependencies installieren
# 2. App bauen
# 3. Git initialisieren
# 4. Auf GitHub pushen
# 5. GitHub Pages Deployment auslösen
# ============================================================

set -e  # Bei Fehler sofort abbrechen

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ZEITERFASSUNG V6.0 – Setup & Deploy  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# ── Voraussetzungen prüfen ──────────────────────────────
echo -e "${YELLOW}[1/6] Prüfe Voraussetzungen...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js nicht gefunden. Bitte installiere Node.js 18+: https://nodejs.org${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗ Node.js $NODE_VERSION ist zu alt. Bitte Node.js 18+ installieren.${NC}"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}✗ Git nicht gefunden. Bitte installiere Git: https://git-scm.com${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v), npm $(npm -v), Git $(git --version | cut -d' ' -f3)${NC}"

# ── .env prüfen ─────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/6] Prüfe Konfiguration...${NC}"

if [ ! -f .env ]; then
    echo -e "${RED}✗ .env Datei fehlt!${NC}"
    echo "  Erstelle eine .env Datei mit:"
    echo "  VITE_SUPABASE_URL=https://dein-projekt.supabase.co"
    echo "  VITE_SUPABASE_ANON_KEY=dein-anon-key"
    exit 1
fi

if grep -q "your-project" .env 2>/dev/null || grep -q "your-anon-key" .env 2>/dev/null; then
    echo -e "${RED}✗ .env enthält noch Platzhalter. Bitte echte Supabase-Daten eintragen.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ .env Datei vorhanden${NC}"

# ── Dependencies installieren ───────────────────────────
echo ""
echo -e "${YELLOW}[3/6] Installiere Dependencies...${NC}"

npm install --no-audit --no-fund 2>&1 | tail -3

echo -e "${GREEN}✓ Dependencies installiert${NC}"

# ── App bauen ───────────────────────────────────────────
echo ""
echo -e "${YELLOW}[4/6] Baue die App...${NC}"

npm run build 2>&1

if [ -d "dist" ]; then
    FILE_COUNT=$(find dist -type f | wc -l | tr -d ' ')
    DIST_SIZE=$(du -sh dist | cut -f1)
    echo -e "${GREEN}✓ Build erfolgreich: ${FILE_COUNT} Dateien, ${DIST_SIZE}${NC}"
else
    echo -e "${RED}✗ Build fehlgeschlagen – dist/ Ordner nicht gefunden${NC}"
    exit 1
fi

# ── Git Setup & Push ────────────────────────────────────
echo ""
echo -e "${YELLOW}[5/6] Git Setup & Push...${NC}"

REPO_URL="https://github.com/vob0x/Zeiterfassung.git"

if [ ! -d ".git" ]; then
    git init
    git branch -M main
fi

# Remote setzen (falls noch nicht vorhanden oder anders)
if git remote get-url origin &> /dev/null; then
    git remote set-url origin "$REPO_URL"
else
    git remote add origin "$REPO_URL"
fi

git add -A
git commit -m "Zeiterfassung V6.0 – React + Supabase + Capacitor

Vollständige Migration von Single-File PWA V5.15 zu modernem Stack:
- React 18 + TypeScript + Vite + Tailwind CSS
- Supabase Backend (PostgreSQL, Auth, Realtime)
- Privacy-First Auth (Codename + Passwort, keine E-Mails)
- Capacitor für iOS
- Offline-Support mit 6-Layer DSB Backup
- Team-Sync via Cloud (Invite-Codes)
- i18n DE/FR (314+ Keys)
- GitHub Pages Deployment via CI/CD" 2>&1 || echo "(Commit existiert bereits)"

echo ""
echo -e "${CYAN}Pushe zu GitHub...${NC}"
echo -e "${CYAN}(Du wirst möglicherweise nach deinen GitHub-Zugangsdaten gefragt)${NC}"
echo ""

git push -u origin main 2>&1

echo -e "${GREEN}✓ Code auf GitHub gepusht${NC}"

# ── Ergebnis ────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[6/6] Fertig!${NC}"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                 SETUP ABGESCHLOSSEN                ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}║  Lokal testen:   npm run dev                      ║${NC}"
echo -e "${GREEN}║  Repo:           github.com/vob0x/Zeiterfassung   ║${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}║  NÄCHSTE SCHRITTE:                                 ║${NC}"
echo -e "${GREEN}║  1. GitHub → Settings → Pages → Source:            ║${NC}"
echo -e "${GREEN}║     'GitHub Actions' auswählen                    ║${NC}"
echo -e "${GREEN}║  2. GitHub → Settings → Secrets → Actions:         ║${NC}"
echo -e "${GREEN}║     VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY    ║${NC}"
echo -e "${GREEN}║     als Repository Secrets anlegen                 ║${NC}"
echo -e "${GREEN}║  3. App öffnen: npm run dev                        ║${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
