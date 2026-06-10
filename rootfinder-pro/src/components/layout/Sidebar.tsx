import { Calculator, FunctionSquare, History, Orbit, Sigma, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppTab, AuthUser } from '@/types';

interface NavigationItem {
  id: AppTab;
  order?: number;
  label: string;
  icon: typeof Sigma;
  count?: number;
}

interface SidebarProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  user: AuthUser | null;
  collapsed?: boolean;
  onLogout?: () => void;
  counts?: Partial<Record<'taylor' | 'methods' | 'polynomial' | 'systems', number>>;
  className?: string;
}

const navigationItems: NavigationItem[] = [
  { id: 'taylor', order: 1, label: 'Taylor', icon: FunctionSquare },
  { id: 'methods', order: 2, label: 'Resolución', icon: Calculator },
  { id: 'polynomial', order: 3, label: 'Polinomios', icon: Sigma },
  { id: 'systems', order: 4, label: 'Sistemas', icon: Orbit },
  { id: 'calculo', order: 5, label: 'Cálculo', icon: TrendingUp },  // ← nuevo
];

const resolutionItems: NavigationItem[] = [
  { id: 'methods', label: 'Entrada', icon: Calculator },
  { id: 'results', label: 'Resultados', icon: Sigma },
  { id: 'history', label: 'Historial', icon: History },
];

/**
 * Navegación lateral principal con módulo activo y acceso inline al flujo de resolución.
 */
export function Sidebar({
  activeTab,
  onNavigate,
  user,
  collapsed = false,
  onLogout,
  counts,
  className,
}: SidebarProps) {
  const activeRoot =
    activeTab === 'methods' || activeTab === 'results' || activeTab === 'graph' || activeTab === 'history'
      ? 'methods'
      : activeTab;

  return (
    <aside
      className={cn(
        'sticky top-14 flex h-[calc(100vh-56px)] w-full max-w-60 flex-col border-r border-[var(--border)] bg-[color:rgba(15,21,18,0.96)] px-3 py-4 backdrop-blur-xl',
        collapsed && 'hidden lg:flex',
        className,
      )}
    >
      <div className="mb-6 px-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Laboratorio
        </p>
        <h2 className="mt-2 text-lg font-extrabold text-[var(--text-primary)]">Módulos</h2>
      </div>

      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoot === item.id;
          const count =
            item.id === 'taylor'
              ? counts?.taylor
              : item.id === 'methods'
              ? counts?.methods
              : item.id === 'polynomial'
              ? counts?.polynomial
              : item.id === 'systems'
              ? counts?.systems
              : item.id === 'calculo'
              ? counts?.systems
              : undefined; 
            

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors',
                isActive
                  ? 'border-[var(--primary)] bg-[color:rgba(16,185,129,0.1)] text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--bg-elevated)]',
              )}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-elevated)]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex items-center gap-2">
                  {item.order ? <span className="text-xs font-semibold text-[var(--text-muted)]">{item.order}.</span> : null}
                  <span className="text-sm font-medium">{item.label}</span>
                </span>
              </span>
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px]">
                {count ?? 0}
              </span>
            </button>
          );
        })}
      </nav>

      {activeRoot === 'methods' ? (
        <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Flujo de resolución
          </p>
          <div className="space-y-2">
            {resolutionItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-[color:rgba(6,182,212,0.14)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-auto rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
          {user?.username || user?.email || 'Sin sesión'}
        </p>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">Panel de trabajo</p>
        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 text-sm font-medium text-[var(--destructive)] transition-colors hover:text-red-300"
          >
            Cerrar sesión
          </button>
        ) : null}
      </div>
    </aside>
  );
}
