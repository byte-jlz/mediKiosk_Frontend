# Project Map — where to find things

Open this project's file explorer in VS Code (`Ctrl+Shift+E` / `Cmd+Shift+E`)
and use this as a guide. Folders are listed in the order you'd actually touch
them while working.

```
src/
│
├── App.jsx                 ⭐ START HERE — every route/page in the whole app
│                              lives in this one file. If you're lost, open
│                              this first to see the full site map.
│
├── AppSwitcher.jsx          The floating "DEMO SWITCHER" pill (dev tool only,
│                              not part of the real product — see comment at
│                              top of the file).
│
├── index.css                All colors, fonts, spacing "tokens" for the whole
│                              app. Change a color here, it updates everywhere.
│
├── components/               Small reusable pieces used across multiple
│   │                          screens (buttons, tables, badges, layout shell).
│   ├── Button.jsx
│   ├── DataTable.jsx
│   ├── StatusBadge.jsx
│   ├── Sidebar.jsx           (admin console nav + header)
│   └── AdminLayout.jsx
│
├── services/                  ⭐ THE HANDOFF POINT TO YOUR BACKEND TEAMMATE.
│   │                           Every fake "API call" lives here. Each function
│   │                           has a comment describing the real FastAPI
│   │                           endpoint it should eventually call.
│   ├── authService.js
│   ├── kioskAgentService.js   (MQTT: sends scans to the kiosk agent, follows its progress)
│   ├── kioskSessionService.js (REST: start / read / complete a kiosk check-in session)
│   ├── vitalsService.js       (patient history)
│   ├── mqttSensorFeed.js      (shared MQTT-over-WebSocket hook for live sensor feeds)
│   ├── tofLiveService.js      (live ToF sensor feed over MQTT — useTofLiveFeed hook)
│   ├── temperatureLiveService.js (live MLX90614 temperature feed — useTemperatureLiveFeed hook)
│   ├── patientsService.js
│   ├── staffService.js
│   ├── kiosksService.js
│   └── auditService.js
│
├── mocks/                     Fake data used by services/ until the real
│                               backend exists. Safe to edit if you want to
│                               demo with different names/numbers.
│
├── patient-app/                📱 The mobile app (patient's own phone)
│   ├── LandingScreen.jsx
│   ├── SignInScreen.jsx
│   ├── SignUpScreen.jsx
│   ├── QrLoginScreen.jsx
│   ├── VitalsHomeScreen.jsx
│   ├── ProfileScreen.jsx
│   └── SettingsScreen.jsx       (the phone only VIEWS records - no measuring)
│
├── kiosk-app/                  🖥 The physical tablet kiosk (landscape)
│   ├── KioskLandingScreen.jsx
│   ├── KioskSignInScreen.jsx
│   ├── KioskQrScanScreen.jsx
│   ├── KioskQrDisplayScreen.jsx
│   ├── KioskVitalsWizard.jsx     ⭐ The check-in: session, MQTT scans, skip / retry
│   ├── wizard/
│   │   ├── kioskSteps.js         ⭐ Step order, names, colors, "I'm ready" wording
│   │   ├── ScanStepScreen.jsx    One step (start / I'm ready / countdown / done / failed)
│   │   ├── WizardProgress.jsx    The progress bar + step circles
│   │   ├── KioskResults.jsx      Final summary (readings only - no risk level)
│   │   └── wizard.css
│   ├── KioskTofMonitorScreen.jsx Live sensor monitor: ToF + temperature (/kiosk/tof-live)
│   ├── TofLiveFeed.jsx           Live ToF card (used on the monitor screen)
│   └── TemperatureLiveFeed.jsx   Live IR temperature card (used on the monitor screen)
│
└── admin-console/               💻 The staff/admin web dashboard
    ├── AdminLoginScreen.jsx
    ├── DashboardScreen.jsx       ("Overview" in the sidebar)
    ├── StaffAccountsScreen.jsx
    ├── PatientRecordsScreen.jsx
    ├── KiosksScreen.jsx
    ├── KiosksActivityScreen.jsx
    └── AuditLogsScreen.jsx
```

## Common things you might want to change

| I want to... | Edit this file |
|---|---|
| Change a color used everywhere | `src/index.css` |
| Change kiosk step order, names, icons, or wording | `src/kiosk-app/wizard/kioskSteps.js` |
| Change the fake patient/staff/kiosk names shown | `src/mocks/*.js` |
| Add a new page/route | `src/App.jsx` |
| Connect a real backend endpoint | The matching file in `src/services/` |

See `README.md` in this same folder for how to run the project.