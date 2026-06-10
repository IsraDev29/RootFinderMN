import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, CircleDot } from 'lucide-react';
import { AppTab } from '@/types';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  user?: any;
  onLogout?: () => void;
}

const moduleTabs = [
  {
    id: 'taylor',
    step: '1',
    title: 'Aproximaciones Taylor',
    subtitle: 'Series y error de truncamiento',
    color: 'emerald',
  },
  {
    id: 'resolution',
    step: '2',
    title: 'Métodos de Resolución',
    subtitle: 'Ecuaciones no lineales',
    color: 'cyan',
  },
  {
    id: 'polynomial',
    step: '3',
    title: 'Raíces Polinómicas',
    subtitle: 'Müller · Bairstow · Horner',
    color: 'amber',
  },
  {
    id: 'systems',
    step: '4',
    title: 'Newton-Raphson Sistemas',
    subtitle: 'Ecuaciones no lineales múltiples',
    color: 'rose',
  },
  {
    id: 'interpolation',
    step: '5',
    title: 'Interpolación y Diferenciación',
    subtitle: 'Splines cúbicos · Diferencias finitas',
    color: 'violet',
  },
] as const;

const resolutionSections = [
  { id: 'verification', label: 'Verificación' },
  { id: 'methods', label: 'Métodos' },
  { id: 'results', label: 'Resultados' },
  { id: 'graph', label: 'Gráficas' },
  { id: 'history', label: 'Historial' },
] as const;

export function Navbar({ activeTab, setActiveTab, user, onLogout }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeModule =
    activeTab === 'systems'
      ? 'systems'
      : activeTab === 'taylor'
      ? 'taylor'
      : activeTab === 'polynomial'
      ? 'polynomial'
      : activeTab === 'interpolation'
      ? 'interpolation'
      : 'resolution';

  const tabColorClass = (tabId: string) => {
    switch (tabId) {
      case 'taylor':
        return 'text-emerald-400 border-emerald-300/25 bg-emerald-300/8';
      case 'resolution':
        return 'text-cyan-400 border-cyan-300/25 bg-cyan-300/8';
      case 'polynomial':
        return 'text-amber-400 border-amber-300/25 bg-amber-300/8';
      case 'systems':
        return 'text-rose-400 border-rose-300/25 bg-rose-300/8';
      case 'interpolation':
        return 'text-violet-400 border-violet-300/25 bg-violet-300/8';
      default:
        return 'text-primary border-primary/25 bg-primary/8';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSection =
    resolutionSections.find((section) => section.id === activeTab)?.label ?? 'Métodos';

  return (
    <nav
      ref={menuRef}
      aria-label="Navegacion principal de modulos"
      className="mb-8 rounded-[1.8rem] border border-primary/10 bg-card/80 px-3 py-3 shadow-xl backdrop-blur-xl"
    >
      <div className="grid gap-2 xl:grid-cols-3">
        {moduleTabs.map((tab) => {
          const isResolution = tab.id === 'resolution';
          const isSelected = tab.id === activeModule;
          const isSelectedTabStyle = isSelected ? tabColorClass(tab.id) : 'border-transparent bg-background/35 opacity-80';
          const dotStyle = isSelected ? tabColorClass(tab.id) : 'text-slate-400/60';

          return (
            <div key={tab.id}>
              <button
                type="button"
                onClick={() => {
                  if (isResolution) {
                    setMenuOpen((open) => !open);
                    return;
                  }
                  setActiveTab(tab.id as AppTab);
                  setMenuOpen(false);
                }}
                className={cn(
                  'flex w-full items-start gap-3 rounded-[1.4rem] border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  isSelected ? isSelectedTabStyle : 'border-transparent bg-background/35 opacity-80'
                )}
              >
                <div className={cn(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  isSelected ? tabColorClass(tab.id) : 'bg-muted text-muted-foreground'
                )}>
                  {tab.step}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{tab.title}</p>
                    <CircleDot className={cn('h-3 w-3 shrink-0', dotStyle)} aria-hidden="true" />
                    {isResolution && (
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform',
                          menuOpen ? 'rotate-180 text-cyan-300' : 'text-muted-foreground'
                        )}
                      />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{tab.subtitle}</p>
                  {isResolution && (
                    <p className="mt-1 truncate text-[11px] font-medium text-primary/80">
                      Vista actual: {currentSection}
                    </p>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {menuOpen && (
        <div className="mt-3 rounded-[1.2rem] border border-primary/10 bg-background/55 p-3 shadow-inner">
          <p className="px-2 pb-3 pt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-primary/60">
            Secciones disponibles
          </p>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {resolutionSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setActiveTab(section.id);
                  setMenuOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition-all',
                  activeTab === section.id
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'bg-card/75 text-foreground hover:bg-primary/8'
                )}
              >
                <span>{section.label}</span>
                {activeTab === section.id && (
                  <span className="text-[11px] font-semibold">Activa</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {user && (
        <div className="mt-4 flex items-center justify-between rounded-[1.2rem] border border-primary/10 bg-background/55 p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </nav>
  );
}
