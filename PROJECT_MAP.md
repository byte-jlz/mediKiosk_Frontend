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
│   ├── vitalsService.js       (sensor readings — has sensor notes at the top)
│   ├── tofLiveService.js      (live ToF sensor feed over MQTT — useTofLiveFeed hook)
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
│   ├── SettingsScreen.jsx
│   └── VitalsWizard/            The 7-step check-in flow
│       ├── stepsConfig.js        ⭐ Edit vital names/colors/copy here
│       ├── VitalsWizard.jsx      Controls step state
│       ├── VitalStepScreen.jsx   Renders one step (shared by all 6 vitals)
│       ├── WizardProgress.jsx    The progress bar + step circles
│       └── ResultsScreen.jsx     Final summary screen
│
├── kiosk-app/                  🖥 The physical tablet kiosk (landscape)
│   ├── KioskLandingScreen.jsx
│   ├── KioskSignInScreen.jsx
│   ├── KioskQrScanScreen.jsx
│   ├── KioskQrDisplayScreen.jsx
│   ├── KioskVitalsWizard.jsx     Reuses patient-app/VitalsWizard/* internally
│   ├── KioskTofMonitorScreen.jsx Live ToF sensor monitor (/kiosk/tof-live)
│   └── TofLiveFeed.jsx           Live ToF card (also shown on the kiosk BMI step)
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
| Change vital step names, icons, or descriptions | `src/patient-app/VitalsWizard/stepsConfig.js` |
| Change the fake patient/staff/kiosk names shown | `src/mocks/*.js` |
| Add a new page/route | `src/App.jsx` |
| Connect a real backend endpoint | The matching file in `src/services/` |

See `README.md` in this same folder for how to run the project.