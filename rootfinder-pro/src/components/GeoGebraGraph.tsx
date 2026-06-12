import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

type GeoGebraPoint = {
  x: number;
  y: number;
  label: string;
};

type HoverCoords = {
  x: number;
  y: number;
  mathX: number;
  mathY: number;
};

interface GeoGebraGraphProps {
  expressions: string[];
  commands?: string[];
  points?: GeoGebraPoint[];
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  heightClassName?: string;
  fallback?: ReactNode;
  showAlgebraInput?: boolean;
}

declare global {
  interface Window {
    GGBApplet?: new (parameters: Record<string, unknown>, useBrowserForJS?: boolean) => { inject: (id: string) => void };
  }
}

type GeoGebraApi = {
  evalCommand: (command: string) => void;
  setCoordSystem?: (...args: number[]) => void;
  setPerspective?: (perspective: string) => void;
  setAxesVisible?: (xVisible: boolean, yVisible: boolean) => void;
  enableRightClick?: (enabled: boolean) => void;
  enableLabelDrags?: (enabled: boolean) => void;
  enableShiftDragZoom?: (enabled: boolean) => void;
  reset?: () => void;
};

function normalizeForGeoGebra(expression: string) {
  return expression
    .trim()
    .replace(/√/g, 'sqrt')
    .replace(/\bra[ií]z\s*cuadrada\b/gi, 'sqrt')
    .replace(/\bra[ií]z\b/gi, 'sqrt')
    .replace(/\bseno\b/gi, 'sin')
    .replace(/\bsen\b/gi, 'sin')
    .replace(/\bcoseno\b/gi, 'cos')
    .replace(/\btangente\b/gi, 'tan')
    .replace(/\bln\b/gi, 'log');
}

function safeObjectName(prefix: string, index: number) {
  return `${prefix}_${index + 1}`;
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.loaded = 'false';
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

export function GeoGebraGraph({
  expressions,
  commands: extraCommands = [],
  points = [],
  xMin = -10,
  xMax = 10,
  yMin = -10,
  yMax = 10,
  heightClassName = 'h-[28rem]',
  fallback,
  showAlgebraInput = false,
}: GeoGebraGraphProps) {
  const containerIdRef = useRef(`geogebra-${crypto.randomUUID()}`);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<GeoGebraApi | null>(null);
  const initializedRef = useRef(false);
  const previousObjectNamesRef = useRef<string[]>([]);
  const lastSyncedSignatureRef = useRef('');
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const [hover, setHover] = useState<HoverCoords | null>(null);
  const enableHoverTooltip = !fallback;
  const expressionsKey = JSON.stringify(expressions);
  const pointsKey = JSON.stringify(points);
  const extraCommandsKey = JSON.stringify(extraCommands);

  const graphCommands = useMemo(() => {
    const expressionCommands = expressions
      .map(normalizeForGeoGebra)
      .filter(Boolean)
      .map((expression, index) => `${safeObjectName('f', index)}(x)=${expression}`);

    const pointCommands = points
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((point, index) => {
        const pointName = safeObjectName('P', index);
        return [
          `${pointName}=(${point.x},${point.y})`,
          `SetCaption(${pointName},"${point.label.replace(/"/g, '')}")`,
          `ShowLabel(${pointName},true)`,
        ];
      })
      .flat();

    return [...expressionCommands, ...pointCommands, ...extraCommands.filter(Boolean)];
  }, [expressions, extraCommands, points, expressionsKey, extraCommandsKey, pointsKey]);

  const objectNames = useMemo(() => {
    const expressionNames = expressions
      .map(normalizeForGeoGebra)
      .filter(Boolean)
      .map((_, index) => safeObjectName('f', index));

    const pointNames = points
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((_, index) => safeObjectName('P', index));

    return [...expressionNames, ...pointNames];
  }, [expressions, points, expressionsKey, pointsKey]);

  const drawableSignature = useMemo(
    () => JSON.stringify({
      graphCommands,
      objectNames,
      xMin,
      xMax,
      yMin,
      yMax,
    }),
    [graphCommands, objectNames, xMax, xMin, yMax, yMin],
  );
  const hasDrawableContent = graphCommands.length > 0;

  const applyViewport = (api: GeoGebraApi) => {
    api.setPerspective?.('G');
    api.setAxesVisible?.(true, true);
    api.enableRightClick?.(false);
    api.enableLabelDrags?.(false);
    api.enableShiftDragZoom?.(true);
    api.setCoordSystem?.(xMin, xMax, yMin, yMax);
  };

  const syncCommands = (api: GeoGebraApi) => {
    api.reset?.();

    graphCommands.forEach((command) => api.evalCommand(command));
    previousObjectNamesRef.current = objectNames;
    applyViewport(api);
  };

  useEffect(() => {
    let cancelled = false;
    if (!hasDrawableContent) return;
    if (initializedRef.current || apiRef.current) return;

    setFailed(false);
    setLoaded(false);
    setSlowLoading(false);
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setSlowLoading(true);
      }
    }, 2500);

    const finalizeLoad = (api: GeoGebraApi) => {
      apiRef.current = api;
      initializedRef.current = true;
      window.clearTimeout(timeout);
      syncCommands(api);
      lastSyncedSignatureRef.current = drawableSignature;
      setSlowLoading(false);
      setFailed(false);
      setLoaded(true);
    };

    const loadViaDeployScript = async () => {
      await loadScriptOnce('https://www.geogebra.org/apps/deployggb.js');
      if (cancelled || !window.GGBApplet) throw new Error('GeoGebra no quedó disponible');

      const target = hostRef.current;
      if (!target) throw new Error('No se encontro el contenedor de GeoGebra');
      const rect = target.getBoundingClientRect();
      const width = Math.max(Math.round(rect.width || target.clientWidth || 640), 320);
      const height = Math.max(Math.round(rect.height || target.clientHeight || 448), 320);
      const parameters = {
        id: containerIdRef.current,
        appName: 'graphing',
        width,
        height,
        showToolBar: false,
        showMenuBar: false,
        showAlgebraView: false,
        showAlgebraInput,
        showDockBar: false,
        showZoomButtons: true,
        showSuggestionButtons: false,
        showKeyboardOnFocus: false,
        allowStyleBar: false,
        showResetIcon: false,
        enableCAS: false,
        enable3d: false,
        enableShiftDragZoom: true,
        errorDialogsActive: false,
        language: 'es',
        appletOnLoad: (api: GeoGebraApi) => {
          if (cancelled) return;
          finalizeLoad(api);
        },
      };

      new window.GGBApplet(parameters, true).inject(containerIdRef.current);
    };

    loadViaDeployScript()
      .catch(() => {
        if (cancelled) return;
        window.clearTimeout(timeout);
        setFailed(true);
        setSlowLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [hasDrawableContent, showAlgebraInput]);

  useEffect(() => {
    if (!apiRef.current || !loaded || !hasDrawableContent) return;
    if (lastSyncedSignatureRef.current === drawableSignature) return;
    syncCommands(apiRef.current);
    lastSyncedSignatureRef.current = drawableSignature;
  }, [drawableSignature, hasDrawableContent, loaded]);

  if (!hasDrawableContent) {
    return (
      <div className={`relative w-full overflow-hidden rounded-2xl border border-primary/20 bg-black ${heightClassName}`}>
        <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
          La gráfica se generará cuando ejecutes el cálculo.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-primary/20 bg-black ${heightClassName}`}
      onMouseMove={(event) => {
        if (!enableHoverTooltip) return;
        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const mathX = xMin + (x / rect.width) * (xMax - xMin);
        const mathY = yMax - (y / rect.height) * (yMax - yMin);
        setHover({ x, y, mathX, mathY });
      }}
      onMouseLeave={() => setHover(null)}
    >
      <div
        id={containerIdRef.current}
        ref={hostRef}
        className="geogebra-host absolute inset-0 h-full w-full text-sm text-muted-foreground"
      />
      {enableHoverTooltip && hover && (
        <div className="graph-tooltip" style={{ left: hover.x + 15, top: hover.y + 15 }}>
          <div className="font-mono font-bold text-primary-foreground/70 mb-0.5">Coordenadas</div>
          <div className="font-mono text-primary">x: {hover.mathX.toFixed(4)}</div>
          <div className="font-mono text-primary">y: {hover.mathY.toFixed(4)}</div>
        </div>
      )}
      {!loaded && (
        <div className="absolute inset-0 bg-black/92">
          {failed ? (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              No se pudo cargar GeoGebra. Revisa tu conexion e intenta de nuevo.
            </div>
          ) : slowLoading && fallback ? (
            fallback
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Cargando GeoGebra...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
