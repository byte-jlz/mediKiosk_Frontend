# MediKiosk — Kiosk App

React (Vite) front-end for the MediKiosk vital-signs kiosk: the portrait
touchscreen (1080 × 1920) in the clinic. This project contains **only the kiosk
app**. The patient phone app and the admin console are no longer in here.

## Run it

```bash
npm install
cp .env.example .env      # then set the backend / MQTT addresses
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Every address goes to
the kiosk's Start screen (`/kiosk`).

```bash
npm run build     # production build in dist/
npm run lint
```

The kiosk needs the FastAPI backend (`backend/`) and the kiosk agent on the Pi
(MQTT) to take real readings. See `backend/README.md`.

## The screens

```
Start ─► Welcome ─┬─► Login with QR ─► Signed in ─┐
                  └─► Continue as Guest ─► Guest welcome ─┴─► Check-in ─► Results ─► Start
```

| Screen | File |
|---|---|
| Start (live date & time) | `src/kiosk-app/StartScreen.jsx` |
| Welcome | `src/kiosk-app/WelcomeScreen.jsx` |
| Login with QR (camera, typed code, USB scanner) | `src/kiosk-app/KioskQrScanScreen.jsx` |
| Signed in | `src/kiosk-app/SignedInScreen.jsx` |
| Guest welcome | `src/kiosk-app/GuestWelcomeScreen.jsx` |
| Check-in (all four readings) | `src/kiosk-app/KioskVitalsWizard.jsx` |
| One reading: intro, "Your turn", measuring, done, measure again, failed | `src/kiosk-app/wizard/ScanStepScreen.jsx` |
| Step bar with % complete | `src/kiosk-app/wizard/StepProgress.jsx` |
| Results | `src/kiosk-app/wizard/KioskResults.jsx` |

## How a check-in works

**Registered patient (Login with QR)**
- A backend session is started; the kiosk agent files every reading under it.
- All four readings are required, in order. There is no Skip.
- When the results screen opens, the check-in is saved to the patient's record
  and sent to the clinic staff queue.

**Guest**
- No backend session: scans are sent with `session: null`, so guest readings are
  shown on screen only and never reach the staff or any record.
- Every reading can be skipped.

**Both**
- A reading within the sensor's margin of error of a clinical cut-off asks for
  one repeat measurement ("Let's take that reading once more").
  ⚠ The cut-offs and margins in `src/kiosk-app/wizard/kioskSteps.js`
  (`BORDERLINE_RULES`) are **placeholders**. Confirm them with your adviser
  and each sensor's datasheet.
- The kiosk never shows the risk level; that is staff-only.
- The patient is signed out on Finish, on Cancel, and whenever the Start screen
  opens. The results screen returns to Start by itself after 30 seconds.

## Where to change things

| I want to… | Edit |
|---|---|
| Change colors | `src/index.css` |
| Change layout, sizes or animations | `src/kiosk-app/kiosk.css` |
| Change step names, wording, tips, timers or repeat-measurement rules | `src/kiosk-app/wizard/kioskSteps.js` |
| Change the logo | replace `src/assets/medikiosk-logo.png` |
| Change the version in the footer | `version` in `package.json` |
| Point the "Get the app" QR code somewhere | `VITE_APP_DOWNLOAD_URL` in `.env` |

## Notes

- The Inter font is bundled (`@fontsource/inter`), so the kiosk works offline.
- The logo in `src/assets/` was cut from a screenshot. Swap in the original
  logo file for the sharpest result.
- The backend in `backend/` still includes the admin console's endpoints. Only
  the front-end apps were removed.
