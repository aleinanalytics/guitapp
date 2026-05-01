# GuitaApp

> Control financiero personal con identidad visual premium. No es un tracker más: es un observatorio financiero.

GuitaApp es una aplicación de gestión financiera personal diseñada para el contexto argentino (ARS/USD, cuotas de tarjeta de crédito, fondo de emergencia). Prioriza la claridad visual, la precisión numérica y una experiencia de usuario que se siente como una pieza de software premium.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 19 + TypeScript + Vite |
| **Estilos** | Tailwind CSS 3.4 con Design System tokenizado (M3-inspired) |
| **Backend/BD** | Supabase (PostgreSQL + Auth + RLS) |
| **Validación** | Zod |
| **Gráficos** | Recharts |
| **Testing** | Vitest + @testing-library/react + jsdom |
| **Animaciones** | Framer Motion |
| **Notificaciones** | Sonner |
| **Ruteo** | React Router v7 |
| **Deploy** | Vercel |

---

## Estructura del Proyecto

```
src/
├── components/          # Componentes React (UI y de dominio)
│   ├── ui/              # Primitivas (Card, etc.)
│   ├── KPI*.tsx         # Indicadores financieros
│   └── *.tsx            # Componentes de página
├── hooks/               # Custom hooks (lógica de datos y negocio)
│   ├── useTransacciones.ts
│   ├── useCuotas.ts
│   ├── useSaldoAcumuladoHastaMes.ts
│   └── ...
├── lib/                 # Utilidades, tipos, schemas, contextos
│   ├── types.ts         # Tipos TypeScript del dominio
│   ├── schemas.ts       # Validaciones Zod
│   ├── utils.ts         # Funciones puras (formato, cálculos, fechas)
│   ├── categoriasJerarquia.ts  # Lógica de categorías jerárquicas
│   ├── supabase.ts      # Cliente Supabase
│   ├── AuthContext.tsx  # Contexto de autenticación
│   └── database.types.ts # Tipos generados de Supabase
├── pages/               # Vistas principales (ruteo)
│   ├── Dashboard.tsx
│   ├── MovimientosMes.tsx
│   ├── TarjetaCreditoMes.tsx
│   └── ...
└── test/                # Setup de testing
    └── setup.ts

supabase/
├── schema.sql           # Esquema base (tablas, RLS, seeds)
└── migration_*.sql      # Migraciones incrementales
```

---

## Scripts Disponibles

```bash
npm run dev        # Servidor de desarrollo (Vite)
npm run build      # Build de producción
npm run preview    # Preview del build
npm run test       # Ejecutar tests (Vitest)
npm run lint       # ESLint
```

---

## Setup Local

### 1. Clonar e instalar

```bash
git clone <repo>
cd GuitaApp
npm install
```

### 2. Variables de entorno

Copiá el `.env.example` a `.env` (o usá el directorio `.claude/` si usás Claude Code):

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

### 3. Base de datos (Supabase)

Para un proyecto nuevo en Supabase, ejecutá el esquema base:

```bash
# Desde SQL Editor en Supabase Dashboard
psql <connection_string> -f supabase/schema.sql
```

Para proyectos existentes, aplicá las migraciones en orden cronológico:

```bash
# Ejecutar manualmente desde el SQL Editor o psql
supabase/migration_bolsillos.sql
supabase/migration_tarjeta_config.sql
supabase/migration_tarjeta_cuotas.sql
# ... etc
```

### 4. Levantar

```bash
npm run dev
```

---

## Arquitectura

### Design System: "Editorial Financial Intelligence"

La UI sigue un sistema de diseño propio documentado en [`DESIGN.md`](./DESIGN.md). Algunas reglas clave:

- **No usar bordes de 1px** para separar contenido. Se usan cambios de tono de superficie.
- **Glassmorphism** para elementos flotantes: `backdrop-blur`, opacidad 40%, borde blanco al 6%.
- **Números tabulares** (`tabular-nums`) para todo monto financiero.
- **Paleta semántica**: Emerald (ingresos), Red (gastos), Violet (suscripciones), Pink (tarjeta), Cyan (disponible).
- **Tokens Tailwind** personalizados en `tailwind.config.js`: `surface`, `surface-container-low`, `primary`, etc.

### Modelo de Dominio

```
Transacción      → ingreso | gasto | suscripción
CompraCuotas     → cuotas de tarjeta de crédito
Deuda            → préstamos personales, prendarios, etc.
TarjetaConfig    → cierre y vencimiento del resumen
Bolsillo         → ahorro / emergencia (movimientos + configuración)
TipoCambio       → cotización USD/ARS diaria
Categoría        → jerárquica (principal → subcategoría)
```

### Lógica Financiera Clave

- **`cuentaComoSalidaDeEfectivo()`**: Determina si una transacción resta del saldo disponible. Las compras en tarjeta de crédito no restan salvo en modo crédito.
- **`mesResumenTarjetaCredito()`**: Asigna una compra TC al mes de resumen correcto según el día de cierre.
- **`excluye_saldo`**: Flag para gastos que no afectan tu disponible (ej. los pagó otra persona).
- **`es_gasto_fijo`**: Marca gastos que entran en el cálculo del fondo de emergencia.

---

## Testing

El proyecto usa **Vitest** con `@testing-library/react` y `jsdom`.

### Ejecutar tests

```bash
npm test              # Modo watch
npm test -- --run    # Una sola vez (CI)
```

### Qué testeamos

- **Funciones puras en `lib/utils.ts`**: parseo de montos, conversión ARS/USD, fechas de resumen TC, variaciones, formateo.
- **Validaciones Zod en `lib/schemas.ts`**: transacciones, cuotas, deudas, tipos de cambio.
- **Lógica de categorías en `lib/categoriasJerarquia.ts`**: ordenamiento, jerarquías, filtros.
- **Funciones puras de hooks**: `getCuotaForMonth`, `cuotasPagadasHastaMes`, `ultimoDiaDelMes`.

### Convenciones

- Los tests viven junto al archivo que testean: `archivo.test.ts`.
- No testeamos hooks con efectos secundarios (llamadas a Supabase) para evitar mocks innecesarios; esas pruebas se hacen vía integración o E2E.

---

## Convenciones de Código

- **TypeScript estricto**: `strict: true`, `noUnusedLocals`, `noUnusedParameters`.
- **Imports absolutos**: No se usan path aliases configurados; usamos rutas relativas.
- **Funciones puras testeables**: La lógica financiera crítica debe estar en `lib/utils.ts` o funciones exportadas de hooks, nunca inline en componentes.
- **Zod para todo form**: Toda validación de entrada pasa por schemas Zod; nunca validación manual ad-hoc.
- **Moneda**: Todos los montos se almacenan como `number` (no string). Los inputs usan `parseMontoInput()` y `montoFieldNextValue()` para el formato es-AR.

---

## Roadmap / Ideas Futuras

- [ ] **Modo Offline / PWA**: Carga de gastos sin conexión con sincronización posterior.
- [ ] **Importación automática**: Parser de CSV/PDF de resúmenes bancarios.
- [ ] **Proyección de cashflow**: Gráfico de "¿llego a fin de mes?".
- [ ] **Tests E2E**: Playwright para flujos críticos de carga y edición.
- [ ] **Notificaciones push**: Recordatorios de vencimientos.

---

## Licencia

Proyecto personal. Uso privado.
