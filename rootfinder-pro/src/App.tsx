import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { AppShell } from '@/components/layout/AppShell';
import { AdvancedMethodsSection } from '@/components/modules/advanced/AdvancedMethodsSection';
import { PolynomialSection } from '@/components/modules/polynomial/PolynomialSection';
import { ResolutionWorkspace } from '@/components/modules/resolution/ResolutionWorkspace';
import { NewtonSystemSection } from '@/components/modules/systems/NewtonSystemSection';
import { TaylorSection } from '@/components/modules/taylor/TaylorSection';
import { WelcomeLanding } from '@/components/welcome/WelcomeLanding';
import { useAuth } from '@/hooks/useAuth';
import { useHistory } from '@/hooks/useHistory';
import { useModuleHistoryCounts } from '@/hooks/useModuleHistoryCounts';
import type { AuthUser } from '@/types';
import { setActiveTab, toggleSidebar, useUiStore, markWelcomeAsSeen } from '@/stores/uiStore';
import type { AppTab } from '@/types';

function getModuleLabel(tab: AppTab): string {
  if (tab === 'taylor') return 'Aproximación con Taylor';
  if (tab === 'polynomial') return 'Raíces polinómicas';
  if (tab === 'advanced') return 'Métodos lineales e interpolación';
  if (tab === 'systems') return 'Newton-Raphson para sistemas';
  return 'Métodos de resolución';
}

function ModuleLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] text-[var(--text-muted)]">
      Cargando sesión...
    </div>
  );
}

function AuthenticatedWorkspace({ user, logout }: { user: AuthUser; logout: () => Promise<void> }) {
  const activeTab = useUiStore((state) => state.activeTab);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const history = useHistory();
  const counts = useModuleHistoryCounts(history.items.length);

  return (
    <AppShell
      activeTab={activeTab}
      activeModuleLabel={getModuleLabel(activeTab)}
      user={user}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={toggleSidebar}
      onNavigate={setActiveTab}
      onLogout={() => void logout()}
      counts={counts}
    >
      {activeTab === 'taylor' ? (
        <TaylorSection />
      ) : activeTab === 'polynomial' ? (
        <PolynomialSection />
      ) : activeTab === 'advanced' ? (
        <AdvancedMethodsSection />
      ) : activeTab === 'systems' ? (
        <NewtonSystemSection />
      ) : (
        <ResolutionWorkspace activeTab={activeTab} history={history} />
      )}
    </AppShell>
  );
}

/**
 * Componente de bienvenida que se muestra después de autenticarse.
 */
function WelcomeScreenWithNavigation({ user, onContinue }: { user: AuthUser; onContinue: () => void }) {
  return (
    <WelcomeLanding
      userName={user.username}
      onNavigateToLab={() => {
        setActiveTab('systems');
        onContinue();
      }}
      onNavigateToRootFinder={() => {
        setActiveTab('taylor');
        onContinue();
      }}
    />
  );
}

/**
 * Punto de entrada principal de la aplicación integrado con la nueva arquitectura.
 */
export default function App() {
  const { user, isAuthenticated, isBootstrapping, logout } = useAuth();
  const hasSeenWelcome = useUiStore((state) => state.hasSeenWelcome);
  const [bootstrapExpired, setBootstrapExpired] = useState(false);

  useEffect(() => {
    if (!isBootstrapping) {
      setBootstrapExpired(false);
      return;
    }

    const timerId = window.setTimeout(() => {
      setBootstrapExpired(true);
    }, 8000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isBootstrapping]);

  if (isBootstrapping && !bootstrapExpired) {
    return <ModuleLoader />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthScreen />
        <Toaster position="bottom-right" richColors />
      </>
    );
  }

  if (!hasSeenWelcome) {
    return (
      <>
        <WelcomeScreenWithNavigation
          user={user}
          onContinue={() => markWelcomeAsSeen()}
        />
        <Toaster position="bottom-right" richColors />
      </>
    );
  }

  return (
    <>
      <AuthenticatedWorkspace user={user} logout={logout} />
      <Toaster position="bottom-right" richColors />
    </>
  );
}
