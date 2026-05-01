import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  ogImage?: string
  noIndex?: boolean
}

const DEFAULT_TITLE = 'GuitaApp'
const DEFAULT_DESCRIPTION = 'Control inteligente de tus finanzas personales. Seguimiento de gastos, inversiones, deudas y más.'
const DEFAULT_KEYWORDS = 'finanzas personales, control gastos, presupuesto, ahorro, inversiones'

/**
 * SEO Component para manejar meta tags dinámicos por página.
 * Usa react-helmet-async para server-side rendering compatible.
 *
 * @example
 * <SEO
 *   title="Deudas"
 *   description="Gestiona tus préstamos y deudas"
 * />
 */
export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  ogImage = '/og-image.png',
  noIndex = false,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE

  return (
    <Helmet>
      {/* Title */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />

      {/* Description y Keywords */}
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="GuitaApp" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Theme color para mobile */}
      <meta name="theme-color" content="#08080f" />
      <meta name="msapplication-TileColor" content="#08080f" />
    </Helmet>
  )
}

/**
 * Configuraciones SEO pre-definidas por página
 */
export const seoConfig = {
  home: {
    title: undefined, // Solo "GuitaApp"
    description: 'Dashboard de finanzas personales. Controla gastos, ingresos y saldo en tiempo real.',
  },
  movimientos: {
    title: 'Movimientos',
    description: 'Registro detallado de todos tus movimientos financieros por mes.',
  },
  tarjetaCredito: {
    title: 'Tarjeta de Crédito',
    description: 'Resumen de consumos, cuotas y vencimientos de tu tarjeta.',
  },
  carga: {
    title: 'Cargar',
    description: 'Registra nuevas transacciones, gastos o ingresos.',
  },
  analisis: {
    title: 'Análisis',
    description: 'Análisis detallado de tus gastos por categoría y evolución mensual.',
  },
  ahorros: {
    title: 'Ahorros',
    description: 'Seguimiento de tus metas de ahorro.',
  },
  fondoEmergencia: {
    title: 'Fondo de Emergencia',
    description: 'Gestiona tu fondo de emergencia y reserva de seguridad.',
  },
  inversiones: {
    title: 'Inversiones',
    description: 'Portafolio de inversiones y seguimiento de rendimientos.',
  },
  presupuesto: {
    title: 'Presupuesto',
    description: 'Planificación y control de tu presupuesto mensual.',
  },
  deudas: {
    title: 'Deudas',
    description: 'Gestiona préstamos, refinanciaciones y arreglos con estudios.',
    keywords: 'deudas, préstamos, refinanciación, cuotas, pagos',
  },
} as const
