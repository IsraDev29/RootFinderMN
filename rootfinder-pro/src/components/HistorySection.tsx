import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalculationResult, AppTab } from '@/types';
import {
  Trash2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Edit2,
  Check,
  X,
  Sigma,
  Sparkles,
  BarChart3,
  Orbit,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { buildCsvContent, downloadTextFile } from '@/lib/exportUtils';
import {
  LOAD_POLYNOMIAL_HISTORY_EVENT,
  LOAD_SYSTEM_HISTORY_EVENT,
  LOAD_TAYLOR_HISTORY_EVENT,
  POLYNOMIAL_HISTORY_KEY,
  POLYNOMIAL_HISTORY_UPDATED_EVENT,
  RESOLUTION_HISTORY_KEY,
  RESOLUTION_HISTORY_UPDATED_EVENT,
  SYSTEM_HISTORY_KEY,
  SYSTEM_HISTORY_UPDATED_EVENT,
  TAYLOR_HISTORY_KEY,
  TAYLOR_HISTORY_UPDATED_EVENT,
} from '@/lib/historyKeys';

type ModuleSection = 'resolution' | 'taylor' | 'polynomial' | 'systems';

type LocalHistoryItem = {
  id: string;
  timestamp: number;
  label?: string;
  [key: string]: any;
};

interface HistorySectionProps {
  history: CalculationResult[];
  onDelete: (id: string) => void;
  onClear: () => void;
  onLoad: (result: CalculationResult) => void;
  onUpdate: (id: string, label: string) => void;
  onNavigateToTab: (tab: AppTab) => void;
  view?: 'full' | 'resolution';
}

const moduleMeta: Record<ModuleSection, { title: string; icon: typeof Sigma; description: string }> = {
  resolution: {
    title: 'Resolucion',
    icon: Sigma,
    description: 'Metodos clasicos con persistencia principal.',
  },
  taylor: {
    title: 'Taylor',
    icon: Sparkles,
    description: 'Aproximaciones, etiquetas y recarga local.',
  },
  polynomial: {
    title: 'Polinomios',
    icon: BarChart3,
    description: 'Muller, Bairstow y Horner con grafica.',
  },
  systems: {
    title: 'Sistemas',
    icon: Orbit,
    description: 'Newton-Raphson 2x2 con trayectoria iterativa.',
  },
};

function readLocalHistory(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function HistorySection({ history, onDelete, onClear, onLoad, onUpdate, onNavigateToTab, view = 'full' }: HistorySectionProps) {
  const [activeSection, setActiveSection] = useState<ModuleSection>('resolution');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [resolutionHistory, setResolutionHistory] = useState<CalculationResult[]>([]);
  const [taylorHistory, setTaylorHistory] = useState<LocalHistoryItem[]>([]);
  const [polynomialHistory, setPolynomialHistory] = useState<LocalHistoryItem[]>([]);
  const [systemsHistory, setSystemsHistory] = useState<LocalHistoryItem[]>([]);

  useEffect(() => {
    const refreshLocalHistories = () => {
      setResolutionHistory(readLocalHistory(RESOLUTION_HISTORY_KEY));
      setTaylorHistory(readLocalHistory(TAYLOR_HISTORY_KEY));
      setPolynomialHistory(readLocalHistory(POLYNOMIAL_HISTORY_KEY));
      setSystemsHistory(readLocalHistory(SYSTEM_HISTORY_KEY));
    };

    refreshLocalHistories();
    window.addEventListener(RESOLUTION_HISTORY_UPDATED_EVENT, refreshLocalHistories);
    window.addEventListener(TAYLOR_HISTORY_UPDATED_EVENT, refreshLocalHistories);
    window.addEventListener(POLYNOMIAL_HISTORY_UPDATED_EVENT, refreshLocalHistories);
    window.addEventListener(SYSTEM_HISTORY_UPDATED_EVENT, refreshLocalHistories);
    window.addEventListener('storage', refreshLocalHistories);
    return () => {
      window.removeEventListener(RESOLUTION_HISTORY_UPDATED_EVENT, refreshLocalHistories);
      window.removeEventListener(TAYLOR_HISTORY_UPDATED_EVENT, refreshLocalHistories);
      window.removeEventListener(POLYNOMIAL_HISTORY_UPDATED_EVENT, refreshLocalHistories);
      window.removeEventListener(SYSTEM_HISTORY_UPDATED_EVENT, refreshLocalHistories);
      window.removeEventListener('storage', refreshLocalHistories);
    };
  }, []);

  const totals = useMemo(
    () => ({
      resolution: resolutionHistory.length,
      taylor: taylorHistory.length,
      polynomial: polynomialHistory.length,
      systems: systemsHistory.length,
    }),
    [resolutionHistory.length, taylorHistory.length, polynomialHistory.length, systemsHistory.length],
  );

  const startEditing = (item: { id: string; label?: string }) => {
    setEditingId(item.id);
    setEditValue(item.label || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveResolutionEdit = (id: string) => {
    updateLocalHistory(
      RESOLUTION_HISTORY_KEY,
      (items) => items.map((item) => (item.id === id ? { ...item, label: editValue.trim() } : item)),
      RESOLUTION_HISTORY_UPDATED_EVENT,
    );
    cancelEdit();
    toast.success('Etiqueta actualizada');
  };

  const updateLocalHistory = (key: string, updateFn: (items: LocalHistoryItem[]) => LocalHistoryItem[], eventName: string) => {
    const current = readLocalHistory(key);
    const next = updateFn(current);
    window.localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event(eventName));
  };

  const saveLocalEdit = (section: ModuleSection, id: string) => {
    const target =
      section === 'resolution'
        ? { key: RESOLUTION_HISTORY_KEY, eventName: RESOLUTION_HISTORY_UPDATED_EVENT }
        : section === 'taylor'
        ? { key: TAYLOR_HISTORY_KEY, eventName: TAYLOR_HISTORY_UPDATED_EVENT }
        : section === 'polynomial'
        ? { key: POLYNOMIAL_HISTORY_KEY, eventName: POLYNOMIAL_HISTORY_UPDATED_EVENT }
        : { key: SYSTEM_HISTORY_KEY, eventName: SYSTEM_HISTORY_UPDATED_EVENT };

    updateLocalHistory(
      target.key,
      (items) => items.map((item) => (item.id === id ? { ...item, label: editValue.trim() } : item)),
      target.eventName,
    );
    cancelEdit();
    toast.success('Etiqueta actualizada');
  };

  const deleteLocalItem = (section: ModuleSection, id: string) => {
    const target =
      section === 'resolution'
        ? { key: RESOLUTION_HISTORY_KEY, eventName: RESOLUTION_HISTORY_UPDATED_EVENT }
        : section === 'taylor'
        ? { key: TAYLOR_HISTORY_KEY, eventName: TAYLOR_HISTORY_UPDATED_EVENT }
        : section === 'polynomial'
        ? { key: POLYNOMIAL_HISTORY_KEY, eventName: POLYNOMIAL_HISTORY_UPDATED_EVENT }
        : { key: SYSTEM_HISTORY_KEY, eventName: SYSTEM_HISTORY_UPDATED_EVENT };

    updateLocalHistory(target.key, (items) => items.filter((item) => item.id !== id), target.eventName);
    cancelEdit();
    toast.success('Registro eliminado');
  };

  const clearLocalSection = (section: ModuleSection) => {
    const target =
      section === 'resolution'
        ? { key: RESOLUTION_HISTORY_KEY, eventName: RESOLUTION_HISTORY_UPDATED_EVENT }
        : section === 'taylor'
        ? { key: TAYLOR_HISTORY_KEY, eventName: TAYLOR_HISTORY_UPDATED_EVENT }
        : section === 'polynomial'
        ? { key: POLYNOMIAL_HISTORY_KEY, eventName: POLYNOMIAL_HISTORY_UPDATED_EVENT }
        : { key: SYSTEM_HISTORY_KEY, eventName: SYSTEM_HISTORY_UPDATED_EVENT };

    window.localStorage.removeItem(target.key);
    window.dispatchEvent(new Event(target.eventName));
    toast.success('Historial limpiado');
  };

  const loadTaylorItem = (item: LocalHistoryItem) => {
    window.dispatchEvent(new CustomEvent(LOAD_TAYLOR_HISTORY_EVENT, { detail: item }));
    onNavigateToTab('taylor');
    toast.success('Registro de Taylor cargado');
  };

  const loadPolynomialItem = (item: LocalHistoryItem) => {
    window.dispatchEvent(new CustomEvent(LOAD_POLYNOMIAL_HISTORY_EVENT, { detail: item }));
    onNavigateToTab('polynomial');
    toast.success('Registro polinomico cargado');
  };

  const loadSystemItem = (item: LocalHistoryItem) => {
    window.dispatchEvent(new CustomEvent(LOAD_SYSTEM_HISTORY_EVENT, { detail: item }));
    onNavigateToTab('systems');
    toast.success('Registro del sistema cargado');
  };

  const exportResolutionToExcel = async () => {
    if (resolutionHistory.length === 0) return toast.error('No hay historial para exportar');

    const XLSX = await import('xlsx');
    const data = resolutionHistory.map((item) => ({
      Fecha: format(item.timestamp, 'dd/MM/yyyy HH:mm:ss'),
      Metodo: item.method,
      Funcion: item.functionF,
      Raiz: item.root,
      Error: item.error,
      Iteraciones: item.iterations.length,
      Convergencia: item.converged ? 'Si' : 'No',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    XLSX.writeFile(wb, 'historial_raices.xlsx');
    toast.success('Archivo Excel exportado');
  };

  const exportResolutionToCSV = () => {
    if (resolutionHistory.length === 0) return toast.error('No hay historial para exportar');

    const headers = ['Fecha', 'Metodo', 'Funcion', 'Raiz', 'Error', 'Iteraciones', 'Convergencia'];
    const rows = resolutionHistory.map((item) => [
      format(item.timestamp, 'dd/MM/yyyy HH:mm:ss'),
      item.method,
      item.functionF,
      item.root,
      item.error,
      item.iterations.length,
      item.converged ? 'Si' : 'No',
    ]);

    const csvContent = buildCsvContent(headers, rows);
    downloadTextFile(csvContent, 'historial_raices.csv', 'text/csv;charset=utf-8;');
    toast.success('Archivo CSV exportado');
  };

  const renderLocalCards = (section: Exclude<ModuleSection, 'resolution'>, items: LocalHistoryItem[]) => {
    if (items.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-primary/15 bg-background/30 p-4 text-sm text-muted-foreground">
          No hay registros en este modulo.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-2xl border border-primary/10 bg-background/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary/60">
                  {format(item.timestamp, 'dd/MM/yy HH:mm')}
                </p>
                {editingId === item.id ? (
                  <div className="mt-2 flex items-center gap-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-8 text-xs w-[180px] bg-background border-primary/30"
                      placeholder="Nota..."
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => saveLocalEdit(section, item.id)}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={cancelEdit}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {item.label || <span className="text-muted-foreground italic text-xs">Sin etiqueta</span>}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => startEditing(item)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-2 py-1 text-[10px] font-bold uppercase text-primary">
                {moduleMeta[section].title}
              </span>
            </div>

            {section === 'taylor' && (
              <>
                <p className="font-mono text-xs break-words [overflow-wrap:anywhere]">f(x) = {item.fx}</p>
                <p className="text-xs text-muted-foreground">
                  orden = {item.order} · a = {item.center} · x = {item.evaluateAt}
                </p>
              </>
            )}

            {section === 'polynomial' && (
              <>
                <p className="font-mono text-xs break-words [overflow-wrap:anywhere]">Coeficientes: {item.coefficientsText}</p>
                <p className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere]">
                  Metodo: {item.method} · Raices: {Array.isArray(item.roots) ? item.roots.join(', ') : 'N/D'}
                </p>
              </>
            )}

            {section === 'systems' && (
              <>
                <p className="font-mono text-xs break-words [overflow-wrap:anywhere]">F1 = {item.functionF1}</p>
                <p className="font-mono text-xs break-words [overflow-wrap:anywhere]">F2 = {item.functionF2}</p>
                <p className="text-xs text-muted-foreground">
                  Solucion: {item.solution ? `(${item.solution.x.toFixed(6)}, ${item.solution.y.toFixed(6)})` : 'N/D'}
                </p>
              </>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  section === 'taylor'
                    ? loadTaylorItem(item)
                    : section === 'polynomial'
                    ? loadPolynomialItem(item)
                    : loadSystemItem(item)
                }
              >
                Cargar
              </Button>
              <Button size="sm" variant="outline" onClick={() => deleteLocalItem(section, item.id)} className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderResolutionHistory = () => (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={exportResolutionToExcel} className="border-primary/20 hover:bg-primary/10">
          <FileSpreadsheet className="w-4 h-4 mr-2 text-primary" />
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={exportResolutionToCSV} className="border-primary/20 hover:bg-primary/10">
          <FileText className="w-4 h-4 mr-2 text-primary" />
          CSV
        </Button>
        <Button variant="destructive" size="sm" onClick={() => clearLocalSection('resolution')}>
          <Trash2 className="w-4 h-4 mr-2" />
          Limpiar modulo
        </Button>
      </div>

      {resolutionHistory.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed border-primary/20 bg-primary/5">
          No hay registros de biseccion, regla falsa, Newton-Raphson, secante o punto fijo.
        </div>
      ) : (
        <div className="rounded-xl border border-primary/10 overflow-hidden bg-background/30">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead className="text-primary/70 font-bold uppercase text-[10px] tracking-widest">Fecha</TableHead>
                <TableHead className="text-primary/70 font-bold uppercase text-[10px] tracking-widest">Etiqueta / Nota</TableHead>
                <TableHead className="text-primary/70 font-bold uppercase text-[10px] tracking-widest">Metodo</TableHead>
                <TableHead className="text-primary/70 font-bold uppercase text-[10px] tracking-widest">Funcion</TableHead>
                <TableHead className="text-primary/70 font-bold uppercase text-[10px] tracking-widest">Raiz</TableHead>
                <TableHead className="text-primary/70 font-bold uppercase text-[10px] tracking-widest">Estado</TableHead>
                <TableHead className="text-right text-primary/70 font-bold uppercase text-[10px] tracking-widest">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resolutionHistory.map((item) => (
                <TableRow key={item.id} className="group hover:bg-primary/5 transition-colors">
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {format(item.timestamp, 'dd/MM/yy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {editingId === item.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 text-xs w-[150px] bg-background border-primary/30"
                          placeholder="Nota..."
                          autoFocus
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => saveResolutionEdit(item.id)}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={cancelEdit}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate max-w-[150px] text-foreground">
                          {item.label || <span className="text-muted-foreground italic text-xs">Sin etiqueta</span>}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => startEditing(item)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="capitalize font-bold text-primary">{item.method}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate text-muted-foreground">{item.functionF}</TableCell>
                  <TableCell className="font-mono text-xs text-secondary font-bold">{item.root !== null ? item.root.toFixed(6) : 'N/A'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.converged ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-destructive/20 text-destructive border border-destructive/30'}`}>
                      {item.converged ? 'OK' : 'FAIL'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => onLoad(item)}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteLocalItem('resolution', item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );

  if (view === 'resolution') {
    return (
      <Card className="max-w-6xl mx-auto border-primary/10 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-primary">Historial de metodos de resolucion</CardTitle>
          <CardDescription>
            Solo registros de biseccion, regla falsa, Newton-Raphson, secante y punto fijo.
          </CardDescription>
        </CardHeader>
        <CardContent>{renderResolutionHistory()}</CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-6xl mx-auto border-primary/10 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle className="text-primary">Historial completo de la app</CardTitle>
            <CardDescription>
              Registros separados por modulos para cargar, editar y limpiar desde un solo lugar.
            </CardDescription>
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            {(Object.keys(moduleMeta) as ModuleSection[]).map((section) => {
              const Icon = moduleMeta[section].icon;
              const selected = activeSection === section;
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    selected ? 'border-primary bg-primary/10' : 'border-primary/10 bg-background/35'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-black">{totals[section]}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{moduleMeta[section].title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{moduleMeta[section].description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {activeSection === 'resolution' ? (
          <>
            {renderResolutionHistory()}
          </>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearLocalSection(activeSection)}
                className="border-primary/20 hover:bg-primary/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar modulo
              </Button>
            </div>
            {activeSection === 'taylor' && renderLocalCards('taylor', taylorHistory)}
            {activeSection === 'polynomial' && renderLocalCards('polynomial', polynomialHistory)}
            {activeSection === 'systems' && renderLocalCards('systems', systemsHistory)}
          </>
        )}
      </CardContent>
    </Card>
  );
}