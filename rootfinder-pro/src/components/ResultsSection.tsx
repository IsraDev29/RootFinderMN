import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalculationResult } from '@/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface ResultsSectionProps {
  result: CalculationResult | null;
}

<<<<<<< Updated upstream
export function ResultsSection({ result }: ResultsSectionProps) {
=======
const methodLabels: Record<CalculationResult['method'], string> = {
  'bisection': 'Bisección',
  'false-position': 'Regla falsa',
  'newton-raphson': 'Newton-Raphson',
  'secant': 'Secante',
  'fixed-point': 'Punto fijo',
  'richardson': 'Richardson',
  'romberg': 'Romberg',
};

export function ResultsSection({ result, onViewGraph, onBackToMethods }: ResultsSectionProps) {
>>>>>>> Stashed changes
  if (!result) {
    return (
      <Card className="max-w-4xl mx-auto border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Info className="w-12 h-12 mb-4 opacity-20" />
          <p>No hay resultados para mostrar. Realiza un cálculo primero.</p>
        </CardContent>
      </Card>
    );
  }

  const columns = result.iterations.length > 0 ? Object.keys(result.iterations[0]) : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-primary">Resumen de Resultados</CardTitle>
              <CardDescription>
                Detalles del cálculo realizado con el método de {result.method}.
              </CardDescription>
            </div>
            <Badge variant={result.converged ? "default" : "destructive"} className="text-sm px-3 py-1 bg-primary text-primary-foreground">
              {result.converged ? "Convergente" : "No Convergente"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-background/50 border border-primary/10">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-widest">Raíz Aproximada</p>
              <p className="text-xl font-mono font-bold text-primary">
                {result.root !== null ? result.root.toFixed(8) : 'N/A'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-background/50 border border-primary/10">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-widest">Error Final (Ea)</p>
              <p className="text-xl font-mono font-bold text-secondary">
                {result.error !== null ? result.error.toExponential(4) : 'N/A'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-background/50 border border-primary/10">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-widest">Iteraciones</p>
              <p className="text-xl font-mono font-bold">{result.iterations.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-background/50 border border-primary/10">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-widest">Estado</p>
              <div className="flex items-center gap-2 mt-1">
                {result.converged ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
                <span className="font-medium text-xs leading-tight">{result.message}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-primary">Tabla de Iteraciones</CardTitle>
          <CardDescription>
            Seguimiento paso a paso del proceso de convergencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px] rounded-xl border border-primary/10 bg-background/30">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 border-b border-primary/10">
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col} className="uppercase text-[10px] font-bold tracking-widest text-primary/70">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.iterations.map((iter, idx) => (
                  <TableRow key={idx} className="hover:bg-primary/5 transition-colors">
                    {columns.map((col) => (
                      <TableCell key={col} className="font-mono text-xs py-3">
                        {typeof iter[col] === 'number' 
                          ? col === 'iteration' 
                            ? (iter[col] as number).toString()
                            : (iter[col] as number).toFixed(6) 
                          : iter[col]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
