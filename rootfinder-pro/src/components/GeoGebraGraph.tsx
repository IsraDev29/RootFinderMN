import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';


type GeoGebraPoint = {
  x: number;
  y: number;
  label: string;
};

interface GeoGebraGraphProps {
  expressions: string[];
  points?: GeoGebraPoint[];
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  heightClassName?: string;
  fallback?: ReactNode;
}

declare global {
  interface Window {
    GGBApplet?: new (parameters: Record<string, unknown>, useBrowserForJS?: boolean) => { inject: (id: string) => void };
  }
}

const GEOGEBRA_SCRIPT_ID = 'geogebra-deploy-script';

function loadGeoGebraScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.GGBApplet) {
      resolve();
      return;
    }

    const existing = document.getElementById(GEOGEBRA_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar GeoGebra')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GEOGEBRA_SCRIPT_ID;
    script.src = 'https://www.geogebra.org/apps/deployggb.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar GeoGebra'));
    document.head.appendChild(script);
  });
}

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

export function GeoGebraGraph({
  expressions,
  points = [],
  xMin = -10,
  xMax = 10,
  yMin = -10,
  yMax = 10,
  heightClassName = 'h-[28rem]',
  fallback,
}: GeoGebraGraphProps) {
  const containerIdRef = useRef(`geogebra-${crypto.randomUUID()}`);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const commands = useMemo(() => {
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

    return [...expressionCommands, ...pointCommands];
  }, [expressions, points]);

  useEffect(() => {
    if (fallback) return;
    let cancelled = false;
    setFailed(false);
    setLoaded(false);
    const timeout = window.setTimeout(() => {
      if (!window.GGBApplet) {
        setFailed(true);
      }
    }, 7000);

    loadGeoGebraScript()
      .then(() => {
        window.clearTimeout(timeout);
        if (cancelled || !window.GGBApplet) return;

        const parameters = {
          appName: 'graphing',
          width: 1200,
          height: 520,
          showToolBar: false,
          showMenuBar: false,
          showAlgebraInput: true,
          showZoomButtons: true,
          enableShiftDragZoom: true,
          errorDialogsActive: false,
          language: 'es',
          appletOnLoad: (api: { evalCommand: (command: string) => void; setCoordSystem?: (...args: number[]) => void }) => {
            commands.forEach((command) => api.evalCommand(command));
            api.setCoordSystem?.(xMin, xMax, yMin, yMax);
            setLoaded(true);
          },
        };

        new window.GGBApplet(parameters, true).inject(containerIdRef.current);
      })
      .catch(() => {
        window.clearTimeout(timeout);
        setFailed(true);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [commands, fallback, xMax, xMin, yMax, yMin]);

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-primary/20 bg-black ${heightClassName}`}>
      <div
        id={containerIdRef.current}
        className="absolute inset-0 h-full w-full text-sm text-muted-foreground"
      />
      {(!loaded || failed) && (
        <div className="absolute inset-0 bg-black">
          {fallback ?? (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              GeoGebra esta cargando. Si no aparece, revisa tu conexion a internet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
