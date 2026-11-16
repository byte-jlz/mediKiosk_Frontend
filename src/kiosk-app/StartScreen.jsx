import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import IdleAttract from './IdleAttract';
import StaffClock from './StaffClock';
import { setLang, t, useLang } from './i18n';
import { Footer, KioskCard, Logo } from './ui/KioskUI';
import { clearPatientSession } from '../services/authService';

// After this long with no touch on the start screen, the intro video starts.
const ATTRACT_AFTER_MS = 10000;

export default function StartScreen() {
  const navigate = useNavigate();
  useLang(); // re-render when a language button is tapped
  const [staffOpen, setStaffOpen] = useState(false);

  // Whoever used the kiosk before is always signed out here, and the language is back to English.
  useEffect(() => {
    clearPatientSession();
    setLang('en');
  }, []);

  return (
    <KioskShell>
      <KioskCard variant="start">
        {/* date + time; hold it 5 s = staff shutdown panel */}
        <StaffClock onOpenChange={setStaffOpen} />
        <div className="k-start__logo">
          <Logo width={640} />
        </div>
        <button type="button" className="k-start__button" onClick={() => navigate('/kiosk/welcome')}>
          {t('Start')}
        </button>
        <p className="k-start__hint">{t('Touch the button to begin')}</p>
        <Footer />
      </KioskCard>
      {/* not while the staff panel is open */}
      <IdleAttract afterMs={ATTRACT_AFTER_MS} paused={staffOpen} />
    </KioskShell>
  );
}
