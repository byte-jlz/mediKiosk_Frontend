# Project Map — where to find things

```
src/
├── App.jsx                    ⭐ START HERE — every kiosk screen (route) in one file
├── main.jsx                   Loads the font, styles and the app
├── index.css                  Colors (brand + one color per reading)
├── assets/
│   └── medikiosk-logo.png
│
├── kiosk-app/
│   ├── kiosk.css              All layout, sizes and animations
│   ├── KioskShell.jsx         The 1080 × 1920 portrait frame, scaled to the window
│   ├── StartScreen.jsx        Live date & time, Start button (signs out the last patient)
│   ├── WelcomeScreen.jsx      Login with QR / Continue as Guest / get the app
│   ├── KioskQrScanScreen.jsx  Camera QR scan + typed code
│   ├── SignedInScreen.jsx     "Hi, <name>!" + the 4 required readings
│   ├── GuestWelcomeScreen.jsx Guest: readings are optional and not sent to staff
│   ├── KioskVitalsWizard.jsx  ⭐ The check-in: session, MQTT scans, skip / repeat / retry rules
│   ├── patientName.js
│   ├── ui/
│   │   ├── KioskUI.jsx        Card, top bar, footer, buttons, pills, lists
│   │   └── Icon.jsx           Line icons
│   └── wizard/
│       ├── kioskSteps.js      ⭐ Step order, wording, tips, timers, "Your turn" prompts,
│       │                         repeat-measurement rules (BORDERLINE_RULES)
│       ├── StepProgress.jsx   Step bar with % complete
│       ├── ScanStepScreen.jsx One reading (intro / your turn / measuring / done / repeat / failed)
│       └── KioskResults.jsx   Final summary (readings only - no risk level)
│
└── services/                  Talking to the outside world
    ├── apiClient.js           fetch wrapper for the FastAPI backend
    ├── authService.js         QR sign-in, who's signed in, sign out
    ├── kioskSessionService.js Start / complete a registered patient's check-in
    ├── kioskAgentService.js   MQTT to the kiosk agent (scan / confirm / cancel)
    ├── patientQr.js           Reads MEDIKIOSK:<token> codes
    └── devAuth.js             DEV-only "Skip login as test patient"
```

See `README.md` for how to run it and how a check-in works.
