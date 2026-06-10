/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CSSProperties, lazy, Suspense, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Navbar } from './components/Navbar';
import { VerificationSection } from './components/VerificationSection';
import { MethodsSection } from './components/MethodsSection';
import { PolynomialSection } from './components/PolynomialSection';
import { ResultsSection } from './components/ResultsSection';
import { Login } from './components/Login';
import { Register } from './components/Register';
import {
  POLYNOMIAL_HISTORY_KEY,
  POLYNOMIAL_HISTORY_UPDATED_EVENT,
  RESOLUTION_HISTORY_KEY,
  RESOLUTION_HISTORY_UPDATED_EVENT,
  SYSTEM_HISTORY_KEY,
  SYSTEM_HISTORY_UPDATED_EVENT,
  TAYLOR_HISTORY_KEY,
  TAYLOR_HISTORY_UPDATED_EVENT,
} from './lib/historyKeys';
import { AppAccessTab, AppTab, CalculationResult, MethodType } from './types';
import { Toaster } from '@/components/ui/sonner';
<<<<<<< Updated upstream
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  ArrowDown,
  Calculator,
  Crosshair,
  Flame,
  Gauge,
  Save,
  Sigma,
  Sparkles,
  Eraser,
  AlertTriangle,
  LoaderCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { clearHistoryItems, deleteHistoryItem, fetchHistory, saveHistoryItem, updateHistoryLabel } from '@/lib/historyApi';
=======
import { AuthScreen } from '@/components/auth/AuthScreen';
import { AppShell } from '@/components/layout/AppShell';
import { PolynomialSection } from '@/components/modules/polynomial/PolynomialSection';
import { ResolutionWorkspace } from '@/components/modules/resolution/ResolutionWorkspace';
import { NewtonSystemSection } from '@/components/modules/systems/NewtonSystemSection';
import { CalculoWorkspace } from '@/components/modules/calculo/CalculoWorkspace';
import { TaylorSection } from '@/components/modules/taylor/TaylorSection';
import { WelcomeLanding } from '@/components/welcome/WelcomeLanding';
import { useAuth } from '@/hooks/useAuth';
import { useHistory } from '@/hooks/useHistory';
import { useModuleHistoryCounts } from '@/hooks/useModuleHistoryCounts';
import type { AuthUser } from '@/types';
import { setActiveTab, toggleSidebar, useUiStore, markWelcomeAsSeen } from '@/stores/uiStore';
import type { AppTab } from '@/types';
>>>>>>> Stashed changes

const HistorySection = lazy(() => import('./components/HistorySection').then((module) => ({ default: module.HistorySection })));
const GraphSection = lazy(() => import('./components/GraphSection').then((module) => ({ default: module.GraphSection })));
const NewtonSystemSection = lazy(() => import('./components/NewtonSystemSection').then((module) => ({ default: module.NewtonSystemSection })));
const TaylorSection = lazy(() => import('./components/TaylorSection').then((module) => ({ default: module.TaylorSection })));

const getModuleTheme = (tab: AppTab) => {
  if (tab === 'taylor') {
    return {
      title: 'Aproximaciones Taylor',
      subtitle: 'Series y error de truncamiento',
      themeClass: 'tab-theme-taylor',
    };
  }

  if (tab === 'polynomial') {
    return {
      title: 'Raíces Polinómicas',
      subtitle: 'Müller · Bairstow · Horner',
      themeClass: 'tab-theme-polynomial',
    };
  }

  if (tab === 'systems') {
    return {
      title: 'Newton-Raphson Sistemas',
      subtitle: 'Ecuaciones no lineales múltiples',
      themeClass: 'tab-theme-systems',
    };
  }

  return {
    title: 'Métodos de Resolución',
    subtitle: 'Ecuaciones no lineales',
    themeClass: 'tab-theme-resolution',
  };
};

const universityImage =
  'https://assets.agris.fao.org/public/styles/fao_ui_banner/public/images/2024-02/420049206_758805662963701_6273589032551930458_n.jpeg?itok=32mHwNjl';

interface LandingHeroProps {
  onOpenApp: (tab?: AppAccessTab) => void;
  onOpenMethods: () => void;
  onLogin: () => void;
}

function LandingHero({ onOpenApp, onOpenMethods, onLogin }: LandingHeroProps) {
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  const handlePointerMove = (event: { currentTarget: HTMLElement; clientX: number; clientY: number }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  const heroStyle = {
    '--mx': `${pointer.x}%`,
    '--my': `${pointer.y}%`,
  } as CSSProperties;
  const imageStyle = {
    transform: `translate(${(50 - pointer.x) * 0.04}px, ${(50 - pointer.y) * 0.04}px) scale(1.08)`,
  } as CSSProperties;

  return (
    <section
      className="relative isolate min-h-[92vh] overflow-hidden bg-[#070908]"
      onPointerMove={handlePointerMove}
      style={heroStyle}
    >
<<<<<<< Updated upstream
      <img
        src={universityImage}
        alt="Edificio principal de la universidad"
        className="absolute inset-0 h-full w-full object-cover opacity-72 transition-transform duration-500 ease-out"
        style={imageStyle}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--mx)_var(--my),rgba(251,191,36,0.18),transparent_18rem),linear-gradient(90deg,rgba(5,8,7,0.94)_0%,rgba(5,8,7,0.70)_42%,rgba(5,8,7,0.26)_100%),linear-gradient(180deg,rgba(5,8,7,0.20)_0%,rgba(5,8,7,0.96)_100%)]" />
      <div className="absolute inset-0 opacity-35 mix-blend-screen landing-grid" />
      <div className="absolute left-[8%] top-[18%] h-24 w-24 border border-amber-300/35 landing-target" />
      <div className="absolute bottom-[18%] right-[10%] h-32 w-32 border border-emerald-300/35 landing-target landing-target-delayed" />

      <motion.div
        className="absolute right-[6%] top-[16%] hidden w-72 border border-cyan-300/25 bg-black/30 p-4 shadow-2xl backdrop-blur-md lg:block"
        animate={{ y: [0, -14, 0], rotate: [1, -1, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex items-center gap-2 text-cyan-100">
          <Activity className="h-4 w-4 text-cyan-300" />
          <span className="text-xs font-bold uppercase">Convergencia en vivo</span>
        </div>
        <div className="mt-4 h-24 overflow-hidden font-mono text-xs leading-6 text-emerald-100/85">
          <p>x0 = -5.0000</p>
          <p>x1 = 0.0000</p>
          <p>x2 = 2.5000</p>
          <p>|f(x)| -&gt; 0.0001</p>
        </div>
      </motion.div>

      <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-between px-4 py-6 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-300/30 bg-black/45 backdrop-blur-md">
              <Sigma className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-lg font-black">RootFinder Pro</p>
              <p className="text-xs text-emerald-100/70">Numerical methods lab</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onLogin}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:border-blue-300/60 hover:bg-blue-300 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => onOpenApp('taylor')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:border-amber-300/60 hover:bg-amber-300 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <Calculator className="h-4 w-4" />
              Abrir app
            </button>
          </div>
        </nav>

        <div className="grid items-end gap-10 pb-10 pt-20 lg:grid-cols-[minmax(0,1.05fr)_28rem]">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className="max-w-4xl"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/12 px-3 py-2 text-xs font-black uppercase text-amber-100 backdrop-blur-md">
              <Flame className="h-4 w-4 text-amber-300" />
              Laboratorio salvaje de raíces
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-none text-white sm:text-7xl lg:text-8xl">
              Domina ecuaciones no lineales desde el campus.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-emerald-50/82 sm:text-lg">
              Una entrada visual para resolver, comparar y verificar métodos numéricos con gráficas, historial y validación paso a paso.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => onOpenApp('taylor')}
                className="group inline-flex items-center justify-center gap-3 rounded-lg bg-emerald-300 px-5 py-4 text-sm font-black text-black shadow-2xl shadow-emerald-500/20 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
              >
                Entrar al laboratorio
                <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-1" />
              </button>
              <button
                type="button"
                onClick={() => onOpenApp('methods')}
                className="inline-flex items-center justify-center gap-3 rounded-lg border border-white/18 bg-black/28 px-5 py-4 text-sm font-bold text-white backdrop-blur-md transition hover:border-cyan-300/60 hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <Crosshair className="h-4 w-4 text-cyan-300" />
                Explorar métodos
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
            className="border border-white/18 bg-black/38 p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-amber-100/80">Misión actual</p>
                <p className="mt-1 text-2xl font-black">Cazar la raíz</p>
              </div>
              <Gauge className="h-8 w-8 text-amber-300" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {['Biseccion', 'Newton', 'Secante'].map((label, index) => (
                <div key={label} className="rounded-lg border border-white/12 bg-white/8 p-3">
                  <p className="text-[11px] font-bold text-white/70">{label}</p>
                  <p className="mt-3 font-mono text-lg text-emerald-200">0{index + 1}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-lg bg-white/10">
              <motion.div
                className="h-full bg-linear-to-r from-emerald-300 via-amber-300 to-rose-400"
                animate={{ width: ['18%', '92%', '48%', '76%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <p className="mt-4 font-mono text-sm text-cyan-100/86">f(x) = x^2 - 4 | raíz detectada: 2</p>
          </motion.div>
        </div>
      </div>
    </section>
=======
      {activeTab === 'taylor' ? (
        <TaylorSection />
      ) : activeTab === 'polynomial' ? (
        <PolynomialSection />
      ) : activeTab === 'systems' ? (
        <NewtonSystemSection />
      ) : activeTab === 'calculo' ? (
        <CalculoWorkspace />
      ) : (
        <ResolutionWorkspace activeTab={activeTab} history={history} />
      )}
    </AppShell>
>>>>>>> Stashed changes
  );
}

export type AppPage = 'landing' | 'app';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);

  const getInitialPage = (): AppPage => {
    if (typeof window === 'undefined') return 'landing';
    return new URLSearchParams(window.location.search).get('page') === 'app' ? 'app' : 'landing';
  };

  const [page, setPage] = useState<AppPage>(getInitialPage());
  const [activeTab, setActiveTab] = useState<AppTab>('taylor');
  const [pendingTab, setPendingTab] = useState<'verification' | 'taylor' | 'methods' | 'polynomial'>('taylor');
  
  // Input States
  const [f, setF] = useState('x^2 - 4');
  const [a, setA] = useState('-5');
  const [b, setB] = useState('5');
  
  // Method States
  const [method, setMethod] = useState<MethodType>('bisection');
  const [tol, setTol] = useState('0.0001');
  const [maxIter, setMaxIter] = useState('100');
  const [x0, setX0] = useState('-5');
  const [x1, setX1] = useState('5');
  const [gx, setGx] = useState('');
  const [g1, setG1] = useState('');

  const [currentResult, setCurrentResult] = useState<CalculationResult | null>(null);
  const [history, setHistory] = useState<CalculationResult[]>([]);
  const [historyStatus, setHistoryStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [resolutionHistoryCount, setResolutionHistoryCount] = useState(0);
  const [systemHistoryCount, setSystemHistoryCount] = useState(0);
  const [taylorHistoryCount, setTaylorHistoryCount] = useState(0);
  const [polynomialHistoryCount, setPolynomialHistoryCount] = useState(0);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // TODO: Validate token with server
      setUser({ email: 'user@example.com' }); // Placeholder
    }
  }, []);

  const handleLogin = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    setUser(userData);
    navigateToApp(pendingTab);
  };

  const handleRegister = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    setUser(userData);
    navigateToApp(pendingTab);
  };

  const requestAppAccess = (tab: AppAccessTab = 'taylor') => {
    if (!user) {
      setPendingTab(tab);
      setAuthMode('login');
      return;
    }

    navigateToApp(tab);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setAuthMode(null);
    setPage('landing');
  };

  const loadSystemHistoryCount = () => {
    try {
      const raw = window.localStorage.getItem(SYSTEM_HISTORY_KEY);
      const items = raw ? JSON.parse(raw) : [];
      setSystemHistoryCount(Array.isArray(items) ? items.length : 0);
    } catch {
      setSystemHistoryCount(0);
    }
  };

  const loadResolutionHistoryCount = () => {
    try {
      const raw = window.localStorage.getItem(RESOLUTION_HISTORY_KEY);
      const items = raw ? JSON.parse(raw) : [];
      setResolutionHistoryCount(Array.isArray(items) ? items.length : 0);
    } catch {
      setResolutionHistoryCount(0);
    }
  };

  const loadTaylorHistoryCount = () => {
    try {
      const raw = window.localStorage.getItem(TAYLOR_HISTORY_KEY);
      const items = raw ? JSON.parse(raw) : [];
      setTaylorHistoryCount(Array.isArray(items) ? items.length : 0);
    } catch {
      setTaylorHistoryCount(0);
    }
  };

  const loadPolynomialHistoryCount = () => {
    try {
      const raw = window.localStorage.getItem(POLYNOMIAL_HISTORY_KEY);
      const items = raw ? JSON.parse(raw) : [];
      setPolynomialHistoryCount(Array.isArray(items) ? items.length : 0);
    } catch {
      setPolynomialHistoryCount(0);
    }
  };

  const handleClearFields = () => {
    setF('');
    setA('');
    setB('');
    setMethod('bisection');
    setTol('0.0001');
    setMaxIter('100');
    setX0('');
    setX1('');
    setGx('');
    setG1('');
    setCurrentResult(null);
    setHasChanges(false);
    toast.success('Campos limpiados correctamente');
  };

  // Detect changes between current inputs and loaded result
  useEffect(() => {
    if (!currentResult) {
      setHasChanges(false);
      return;
    }

    const isDifferent = 
      f !== currentResult.functionF ||
      method !== currentResult.method ||
      gx !== (currentResult.functionG || '') ||
      tol !== (currentResult.params.tol?.toString() || '') ||
      maxIter !== (currentResult.params.maxIter?.toString() || '') ||
      a !== (currentResult.params.a?.toString() || '') ||
      b !== (currentResult.params.b?.toString() || '') ||
      x0 !== (currentResult.params.x0?.toString() || '') ||
      x1 !== (currentResult.params.x1?.toString() || '') ||
      g1 !== (currentResult.params.g1Value?.toString() || '');

    setHasChanges(isDifferent);
  }, [f, a, b, method, tol, maxIter, x0, x1, gx, g1, currentResult]);

  // Load history from API
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setHistoryStatus('idle');
      setHistory([]);
      return;
    }

    let active = true;
    setHistoryStatus('loading');

    fetchHistory()
      .then((data) => {
        if (!active) return;
        setHistory(data);
        setHistoryStatus('idle');
      })
      .catch((err) => {
        if (!active) return;
        console.error('Error loading history:', err);
        setHistoryStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadResolutionHistoryCount();
    loadSystemHistoryCount();
    loadTaylorHistoryCount();
    loadPolynomialHistoryCount();

    const refreshResolution = () => loadResolutionHistoryCount();
    const refreshSystem = () => loadSystemHistoryCount();
    const refreshTaylor = () => loadTaylorHistoryCount();
    const refreshPolynomial = () => loadPolynomialHistoryCount();
    const refreshAll = () => {
      loadSystemHistoryCount();
      loadResolutionHistoryCount();
      loadTaylorHistoryCount();
      loadPolynomialHistoryCount();
    };
    window.addEventListener(RESOLUTION_HISTORY_UPDATED_EVENT, refreshResolution);
    window.addEventListener(SYSTEM_HISTORY_UPDATED_EVENT, refreshSystem);
    window.addEventListener(TAYLOR_HISTORY_UPDATED_EVENT, refreshTaylor);
    window.addEventListener(POLYNOMIAL_HISTORY_UPDATED_EVENT, refreshPolynomial);
    window.addEventListener('storage', refreshAll);

    return () => {
      window.removeEventListener(RESOLUTION_HISTORY_UPDATED_EVENT, refreshResolution);
      window.removeEventListener(SYSTEM_HISTORY_UPDATED_EVENT, refreshSystem);
      window.removeEventListener(TAYLOR_HISTORY_UPDATED_EVENT, refreshTaylor);
      window.removeEventListener(POLYNOMIAL_HISTORY_UPDATED_EVENT, refreshPolynomial);
      window.removeEventListener('storage', refreshAll);
    };
  }, []);

  const navigateToApp = (tab: AppAccessTab = 'taylor') => {
    setPage('app');
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', 'app');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const navigateToLanding = () => {
    setPage('landing');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('page');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleNewResult = async (result: CalculationResult) => {
    // Si estamos editando un resultado existente, conservar su ID para el UPSERT
    const finalResult = currentResult && hasChanges 
      ? { ...result, id: currentResult.id, label: currentResult.label } 
      : result;

    setCurrentResult(finalResult);
    setGx(finalResult.functionG || '');

    try {
      const raw = window.localStorage.getItem(RESOLUTION_HISTORY_KEY);
      const localItems = raw ? JSON.parse(raw) : [];
      const safeItems = Array.isArray(localItems) ? localItems : [];
      const nextItems = [finalResult, ...safeItems.filter((item: CalculationResult) => item.id !== finalResult.id)].slice(0, 50);
      window.localStorage.setItem(RESOLUTION_HISTORY_KEY, JSON.stringify(nextItems));
      window.dispatchEvent(new Event(RESOLUTION_HISTORY_UPDATED_EVENT));
    } catch {
      // Ignore local history failures.
    }
    
    // Actualizar historial local
    setHistory(prev => {
      const filtered = prev.filter(item => item.id !== finalResult.id);
      return [finalResult, ...filtered].slice(0, 50);
    });
    
    setActiveTab('results');
    setHasChanges(false);
    
    try {
      await saveHistoryItem(finalResult);
      toast.success(currentResult && hasChanges ? 'Cálculo actualizado' : 'Nuevo cálculo guardado');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      console.error('Error saving to DB:', err);
      toast.error('No se pudo guardar en la base de datos: ' + message);
    }
  };

  const handleSaveChanges = async () => {
    setActiveTab('methods');
    setTimeout(() => {
      const calcBtn = document.getElementById('calculate-root-button');
      calcBtn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.info('Haz clic en "Calcular Raíz" para actualizar el registro con los nuevos valores.');
    }, 100);
  };

  const handleDeleteHistory = async (id: string) => {
    const previous = history;
    setHistory(prev => prev.filter(item => item.id !== id));
    if (currentResult?.id === id) setCurrentResult(null);
    try {
      await deleteHistoryItem(id);
    } catch (err) {
      setHistory(previous);
      console.error('Error deleting from DB:', err);
      toast.error('No se pudo eliminar el registro');
    }
  };

  const handleClearHistory = async () => {
    const previous = history;
    setHistory([]);
    setCurrentResult(null);
    try {
      await clearHistoryItems();
    } catch (err) {
      setHistory(previous);
      console.error('Error clearing DB:', err);
      toast.error('No se pudo limpiar el historial');
    }
  };

  const handleUpdateHistory = async (id: string, label: string) => {
    const previous = history;
    setHistory(prev => prev.map(item => item.id === id ? { ...item, label } : item));
    try {
      await updateHistoryLabel(id, label);
    } catch (err) {
      setHistory(previous);
      console.error('Error updating DB:', err);
      toast.error('No se pudo actualizar la etiqueta');
    }
  };

  const handleLoadHistory = (result: CalculationResult) => {
    setCurrentResult(result);
    setF(result.functionF);
    setMethod(result.method);
    setGx(result.functionG || '');
    
    // Load params
    const p = result.params;
    if (p.a !== undefined) setA(p.a.toString());
    if (p.b !== undefined) setB(p.b.toString());
    if (p.tol !== undefined) setTol(p.tol.toString());
    if (p.maxIter !== undefined) setMaxIter(p.maxIter.toString());
    if (p.x0 !== undefined) setX0(p.x0.toString());
    if (p.x1 !== undefined) setX1(p.x1.toString());
    if (p.g1Value !== undefined) setG1(p.g1Value.toString());
    
    setActiveTab('results');
    toast.success('Datos cargados del historial');
  };

  const activeModuleMetadata = getModuleTheme(activeTab);

  return (
    <div className={cn('min-h-screen bg-background text-foreground font-sans selection:bg-primary/20', activeModuleMetadata.themeClass)}>
      {!user ? (
        authMode ? (
          authMode === 'login' ? (
            <Login
              onLogin={handleLogin}
              onSwitchToRegister={() => setAuthMode('register')}
            />
          ) : (
            <Register
              onRegister={handleRegister}
              onSwitchToLogin={() => setAuthMode('login')}
            />
          )
        ) : (
          <LandingHero
            onOpenApp={(tab = 'verification') => requestAppAccess(tab)}
            onOpenMethods={() => requestAppAccess('methods')}
            onLogin={() => setAuthMode('login')}
          />
        )
      ) : page === 'landing' ? (
        <LandingHero
          onOpenApp={(tab = 'verification') => requestAppAccess(tab)}
          onOpenMethods={() => requestAppAccess('methods')}
          onLogin={() => setAuthMode('login')}
        />
      ) : (
        <>
          <header className="sticky top-0 z-50 border-b border-primary/10 bg-card/65 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
                  <Calculator className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">RootFinder <span className="text-primary">Pro</span></h1>
                  <p className="text-sm text-muted-foreground">Análisis visual y validación paso a paso de métodos numéricos</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={navigateToLanding}
                  className="h-auto rounded-2xl border-primary/20 bg-background/40 px-4 py-3 text-primary hover:bg-primary/10 transition-colors"
                >
                  Volver a la landing
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleClearFields}
                  className="h-auto rounded-2xl border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all flex flex-col items-center justify-center gap-1 group"
                >
                  <Eraser className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Limpiar</span>
                </Button>
              </div>
            </div>
          </header>
          <main id="workspace" className="max-w-7xl mx-auto px-4 py-8 relative scroll-mt-24">
<section className="mb-8 grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="rounded-[2rem] border border-primary/10 bg-linear-to-br from-primary/10 via-card/70 to-card/70 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60">Panel Principal</p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">{activeModuleMetadata.title}</h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                  Explora {activeModuleMetadata.subtitle.toLowerCase()} y aplica la paleta activa para graficas, cuadros e interacciones.
                  Esta vista prioriza el proceso académico antes de llegar a los métodos de resolución.
                </p>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-xl shadow-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Módulo activo</p>
                <p className="mt-3 text-xl font-black text-primary">{activeModuleMetadata.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{activeModuleMetadata.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[2rem] border border-primary/10 bg-card/55 p-6 shadow-xl backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(true)}
                className="w-full text-left"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/60">Estado de aprendizaje</p>
                <p className="mt-3 text-3xl font-black">{resolutionHistoryCount + systemHistoryCount + taylorHistoryCount + polynomialHistoryCount}</p>
                <p className="mt-2 text-sm text-muted-foreground">Toca aqui para abrir el historial completo por modulos.</p>
              </button>
            </div>
            <div className="rounded-[2rem] border border-primary/10 bg-card/55 p-6 shadow-xl backdrop-blur-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/60">Siguiente paso</p>
              <p className="mt-3 text-xl font-black">Métodos de resolución</p>
              <p className="mt-2 text-sm text-muted-foreground">Accede rápidamente a los métodos numéricos cuando necesites resolver la ecuación.</p>
                </div>
              </div>
            </section>

            <Navbar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />

            <div className="relative min-h-[600px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Suspense
                    fallback={
                      <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-primary/10 bg-card/50">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                          Cargando modulo...
                        </div>
                      </div>
                    }
                  >
                    {activeTab === 'verification' && (
                      <VerificationSection f={f} setF={setF} a={a} setA={setA} b={b} setB={setB} />
                    )}
                    {activeTab === 'taylor' && (
                      <TaylorSection />
                    )}
                    {activeTab === 'methods' && (
                      <MethodsSection 
                        f={f} a={a} b={b} 
                        method={method} setMethod={setMethod}
                        tol={tol} setTol={setTol}
                        maxIter={maxIter} setMaxIter={setMaxIter}
                        x0={x0} setX0={setX0}
                        x1={x1} setX1={setX1}
                        gx={gx} setGx={setGx}
                        g1={g1} setG1={setG1}
                        onResult={handleNewResult} 
                      />
                    )}
                    {activeTab === 'polynomial' && (
                      <PolynomialSection />
                    )}
                    {activeTab === 'results' && (
                      <ResultsSection result={currentResult} />
                    )}
                    {activeTab === 'history' && (
                      <HistorySection 
                        history={history} 
                        onDelete={handleDeleteHistory} 
                        onClear={handleClearHistory}
                        onLoad={handleLoadHistory}
                        onUpdate={handleUpdateHistory}
                        onNavigateToTab={setActiveTab}
                        view="resolution"
                      />
                    )}
                    {activeTab === 'graph' && (
                      <GraphSection f={f} root={currentResult?.root || null} />
                    )}
                    {activeTab === 'systems' && (
                      <NewtonSystemSection />
                    )}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {hasChanges && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  className="fixed bottom-8 right-8 z-[60]"
                >
                  <Button 
                    onClick={handleSaveChanges}
                    className="shadow-2xl h-14 px-6 rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold flex gap-2 items-center group"
                  >
                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Guardar Cambios</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <DialogContent
            isOpen={historyModalOpen}
            onClose={() => setHistoryModalOpen(false)}
            className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden bg-background border-primary/20"
          >
            <DialogHeader className="border-b border-primary/10 px-6 py-4">
              <DialogTitle>Historial completo de la app</DialogTitle>
              <DialogDescription>
                Registros separados por modulos en una ventana emergente.
              </DialogDescription>
            </DialogHeader>
            <div className="h-[calc(90vh-5.5rem)] overflow-auto p-4">
              <HistorySection
                history={history}
                onDelete={handleDeleteHistory}
                onClear={handleClearHistory}
                onLoad={(item) => {
                  handleLoadHistory(item);
                  setHistoryModalOpen(false);
                }}
                onUpdate={handleUpdateHistory}
                onNavigateToTab={(tab) => {
                  setActiveTab(tab);
                  setHistoryModalOpen(false);
                }}
              />
            </div>
          </DialogContent>

          <footer className="border-t border-primary/10 bg-card/50 py-12 mt-12 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary/60">
                  Proyecto Desarrollado Por
                </p>
                <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  Israel Espinoza <span className="text-primary">|</span> Luis Pérez <span className="text-primary">|</span> Randall Arguello
                </p>
              </div>
              <p className="text-xs text-muted-foreground pt-4 border-t border-primary/5 max-w-md mx-auto">
                &copy; {new Date().getFullYear()} RootFinder Pro. Herramienta educativa para análisis numérico.
              </p>
            </div>
          </footer>
        </>
      )}

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
