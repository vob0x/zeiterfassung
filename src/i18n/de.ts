// German translations for Zeiterfassung app
export const de = {
  // Navigation
  nav: {
    timer: "Timer",
    entries: "Einträge",
    dashboard: "Dashboard",
    manage: "Verwaltung",
    team: "Team",
  },
  bnav: {
    timer: "Timer",
    entries: "Einträge",
    dashboard: "Dashboard",
    manage: "Verwaltung",
    team: "Team",
  },

  // Timer Section
  timer: {
    tasks: "Tasks",
    manualTitle: "Manueller Eintrag",
    todayTotal: "Heute total",
    addTask: "+ Neuen Task hinzufügen",
    multipleTasks: "Mehrere Tasks",
    running: "LÄUFT",
    paused: "PAUSE",
    ready: "Bereit",
    startHint: "Starte einen Task mit ▶",
    pause: "Pause",
    start: "Start",
    stopSave: "Stopp & Speichern",
    removeTask: "Task entfernen",
    endDay: "Feierabend",
    dailyGoal: "Tagesziel",
  },
  manual: {
    title: "Manuell eintragen",
  },
  ph: {
    stakeholder: "Stakeholder",
    projekt: "Projekt",
    taetigkeit: "Tätigkeit",
    notiz: "Notiz (optional)",
    select: "— wählen —",
    newStakeholder: "Neuer Stakeholder...",
    newProjekt: "Neues Projekt...",
    newTaetigkeit: "Neue Tätigkeit...",
    teamName: "Dein Name (z.B. Anna)",
    teamNameInput: "Team-Name",
  },
  ts: {
    pause: "Pause",
    start: "Start",
    stopSave: "Stopp & Speichern",
    remove: "Task entfernen",
  },

  // Entries Section
  entries: {
    title: "Erfasste Einträge",
    count: "Einträge",
    total: "Total:",
    of: "von",
    nodata: "Noch keine Einträge vorhanden.",
    noMatch: "Keine Treffer für aktiven Filter",
    totalSuffix: "Einträge total",
    allStakeholder: "Alle Stakeholder",
    allProjekte: "Alle Projekte",
    allTaetigkeiten: "Alle Tätigkeiten",
  },
  all: {
    stakeholder: "Alle Stakeholder",
    projekte: "Alle Projekte",
    taetigkeiten: "Alle Tätigkeiten",
  },
  filter: {
    notiz: "🔍 Notiz...",
    from: "Ab",
    to: "Bis",
    clearAll: "✕ Alle zurücksetzen",
  },
  th: {
    datum: "Datum",
    stakeholder: "Stakeholder",
    projekt: "Projekt",
    taetigkeit: "Tätigkeit",
    von: "Von",
    bis: "Bis",
    dauer: "Dauer",
    notiz: "Notiz",
  },

  // Dashboard Section
  dash: {
    today: "Heute",
    week: "Woche",
    month: "Monat",
    year: "Jahr",
    thisWeek: "Diese Woche",
    thisMonth: "Dieser Monat",
    thisYear: "Dieses Jahr",
    all: "Gesamt",
    shxpr: "Stakeholder × Projekt",
    byActivity: "Nach Tätigkeit",
    timeline: "Zeitverlauf",
    noData: "Keine Daten verfügbar",
    noEntries: "📭 Keine Einträge im gewählten Zeitraum",
  },

  // Manage Section
  manage: {
    stakeholder: "Stakeholder",
    projekte: "Projekte",
    taetigkeiten: "Tätigkeiten",
    backup: "Backup & Wiederherstellung",
    csv: "CSV (nur Einträge)",
    noEntries: "Noch keine Einträge",
    deleted: "gelöscht.",
    labelSh: "Stakeholder",
    labelPr: "Projekt",
    labelTa: "Tätigkeit",
    backupHint: "Vor einem Update: Backup erstellen → HTML-Datei ersetzen → Backup wiederherstellen.",
    warning: "Achtung",
    confirmDeleteAll: "Ja, alle Daten löschen",
    addNew: "Neu hinzufügen...",
  },

  // Team Section
  team: {
    setupText: "Team-Setup",
    connect: "Ordner verbinden",
    connected: "Verbunden als",
    sync: "🔄 Sync",
    nodata: "Noch keine Daten. Drücke \"Sync\".",
    week: "Woche",
    month: "Monat",
    year: "Jahr",
    all: "Gesamt",
    custom: "Zeitraum",
    export: "📊 Excel-Export",
    attendance: "📅 Tagesübersicht — Wer war wann aktiv",
    shxperson: "Stakeholder × Person",
    prxperson: "Projekt × Person",
    workload: "Auslastung pro Person",
    timeline: "Zeitverlauf",
    hours: "Stunden",
    persons: "Personen",
    perPerson: "⌀/Person",
    perDay: "⌀/Tag",
    total: "Total",
    today: "heute",
    avgWorkday: "⌀ / Arbeitstag",
    create: "Team erstellen",
    join: "Beitreten",
    disconnect: "Trennen",
    nameRequired: "Team-Name erforderlich",
    codeRequired: "Invite-Code und Name erforderlich",
    inviteCodePlaceholder: "Invite-Code (6 Zeichen)",
    yourName: "Dein Name",
    invalidCode: "Ungültiger Invite-Code",
    onlineMode: "Supabase verbunden — Echtzeit-Sync aktiv",
    offlineMode: "Offline-Modus — Team-Daten nur lokal",
  },

  // KPIs
  kpi: {
    today: "Heute",
    entries: "Einträge",
    todaySubtitle: "Heute erfasst",
    periodSubtitle: "Im Zeitraum",
    entriesSubtitle: "Einträge",
  },

  // Edit
  edit: {
    title: "Eintrag bearbeiten",
  },

  // Buttons
  btn: {
    backup: "💾 Komplett-Backup",
    restore: "📦 Backup wiederherstellen",
    csvExport: "📥 CSV Export",
    csvImport: "📤 CSV Import",
    save: "Speichern",
    cancel: "Abbrechen",
    close: "Schliessen",
    deleteAll: "🗑️ Alle Daten löschen",
    undo: "Rückgängig",
  },

  // Validation
  validation: {
    required: "Pflichtfeld",
  },

  // Toasts
  toast: {
    saved: "gespeichert",
    deleted: "gelöscht",
    midnight: "über Mitternacht (2 Einträge)",
    manualOk: "manuell eingetragen.",
    tooShort: "Timer war zu kurz",
    backupOk: "Backup gespeichert",
    restoreOk: "Backup wiederhergestellt",
    importOk: "Einträge importiert.",
    exportOk: "Excel-Export heruntergeladen",
    syncOk: "Teammitglieder geladen.",
    connected: "Verbunden als",
    disconnected: "Team-Verbindung getrennt.",
    allDeleted: "Alle Daten gelöscht.",
    selectShPr: "Bitte Stakeholder und Projekt wählen.",
    selectDate: "Bitte Datum eingeben.",
    selectTime: "Bitte Von- und Bis-Zeit eingeben.",
    endAfterStart: "Bis-Zeit muss nach Von-Zeit liegen.",
    entryUpdated: "Eintrag aktualisiert.",
    entryDeleted: "Eintrag gelöscht.",
    entryRestored: "Eintrag wiederhergestellt.",
    duplicate: "existiert bereits.",
    added: "hinzugefügt.",
    renamed: "Umbenannt zu",
    csvExported: "CSV exportiert.",
    max8: "Maximal 8 Tasks.",
    error: "Fehler:",
    noExport: "Keine Einträge zum Exportieren.",
  },

  // Confirmations
  confirm: {
    delete: "Eintrag löschen?",
    deleteAll: "⚠️ ACHTUNG: Alle Daten werden unwiderruflich gelöscht...",
    deleteItem: "wirklich löschen?",
    disconnect: "Team-Verbindung trennen?",
  },

  // Labels
  label: {
    datum: "Datum",
    von: "Von",
    bis: "Bis",
    notiz: "Notiz",
    stakeholder: "Stakeholder",
    projekt: "Projekt",
    taetigkeit: "Tätigkeit",
  },

  // Weekdays
  wd: {
    short: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    long: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
  },

  // Welcome
  welcome: {
    fullTitle: "Willkommen bei Zeiterfassung",
    backupQ: "Backup wiederherstellen?",
    restoreBtn: "Wiederherstellen",
    noEntries: "Keine Einträge vorhanden",
    hint: "Starten Sie damit, einen neuen Task zu erfassen",
    or: "oder",
  },

  // Shortcuts
  sc: {
    remove: "Entfernen",
    pin: "Anheften",
    unpin: "Abheften",
    pinned: "Angeheftet",
    unpinned: "Nicht angeheftet",
    add: "Hinzufügen",
    addShort: "Schnell hinzufügen",
    addTitle: "Neue Kombination hinzufügen",
    addBtn: "+ Hinzufügen",
    selectBoth: "Bitte beide wählen",
    exists: "existiert bereits",
    max: "Maximal 8 Einträge",
    needData: "Benötigt Daten",
  },

  // Keyboard shortcuts
  kbd: {
    title: "Tastaturkürzel",
    space: "Space zum Starten/Pausieren",
    s: "S zum Speichern",
    n: "N für neuen manuellen Eintrag",
    tabs: "Tab zum Wechseln der Seite",
    f: "F zum Filtern",
    q: "Q zum Beenden",
    esc: "ESC zum Schliessen",
  },

  // Settings
  settings: {
    design: "Design",
    language: "Sprache",
    profile: "Profil",
    preview: "Vorschau:",
    notSet: "nicht gesetzt",
    teamName: "Team-Name",
    members: "Mitglieder",
    inviteCode: "Invite Code",
    copied: "In Zwischenablage kopiert",
    info: "Info",
    appDesc: "Eine moderne Zeit-Tracking-App für Teams",
    copyright: "Alle Daten werden lokal gespeichert.",
    dataSync: "Datensynchronisation",
    synced: "Synchronisiert",
    confirmSignOut: "Wirklich abmelden?",
  },

  // Titles
  title: {
    backup: "Backup erstellen",
    rename: "Umbenennen",
    delete: "Löschen",
    edit: "Bearbeiten",
    remove: "Entfernen",
    newSh: "Neuer Stakeholder",
    newPr: "Neues Projekt",
    newTa: "Neue Tätigkeit",
    stopAll: "Alle beenden",
    resetFilter: "Filter zurücksetzen",
    langToggle: "Sprache wechseln",
    themeToggle: "Design wechseln",
  },

  // Data sync board
  dsb: {
    cancelled: "Abgebrochen",
    crcWarn: "CRC-Warnung",
    confirmRestore: "Wiederherstellung bestätigen",
    restored: "Wiederhergestellt",
    heartbeatFound: "Heartbeat gefunden",
    heartbeatOk: "Heartbeat OK",
    startupWarn: "Startup-Warnung",
    startupRestore: "Startup-Wiederherstellung",
  },

  // CSV
  csv: {
    datum: "Datum",
    stakeholder: "Stakeholder",
    projekt: "Projekt",
    taetigkeit: "Tätigkeit",
    von: "Von",
    bis: "Bis",
    dauer: "Dauer",
    notiz: "Notiz",
    wochentag: "Wochentag",
  },

  // Miscellaneous
  of: "von",
  date: "Datum",
  duration: "Dauer",
  stakeholder: "Stakeholder",
  projekt: "Projekt",
  taetigkeit: "Tätigkeit",
  running: "LÄUFT",
  paused: "PAUSE",
  empty: "(leer)",
  from: "Von",
  to: "Bis",
  bis: "bis",
  app: {
    title: "Zeiterfassung",
  },
  period: {
    label: "Zeitraum",
  },

  // Authentication
  auth: {
    title: "Anmelden",
    codename: "Codename",
    password: "Passwort",
    signIn: "Anmelden",
    signUp: "Registrieren",
    noAccount: "Noch kein Konto?",
    hasAccount: "Bereits ein Konto?",
    codenameTaken: "Codename bereits vergeben",
    signOut: "Abmelden",
    logout: "Logout",
    subtitle: "Effiziente Zeiterfassung",
    disclaimer: "Pseudonyme Zeiterfassung. Ihre Privatsphäre ist wichtig.",
    codenameExample: "z.B. alex, sophie",
    confirmPassword: "Passwort bestätigen",
    errors: {
      codenameRequired: "Codename ist erforderlich",
      passwordRequired: "Passwort ist erforderlich",
      passwordsMismatch: "Passwörter stimmen nicht überein",
      passwordTooShort: "Passwort muss mindestens 6 Zeichen lang sein",
      authFailed: "Authentifizierung fehlgeschlagen",
    },
  },
  ui: {
    loading: "Laden...",
    toggleTheme: "Design wechseln",
    toggleLanguage: "Sprache wechseln",
    viewContent: "Inhalt für",
  },
} as const;
