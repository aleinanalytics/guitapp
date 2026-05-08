import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { formatARS, formatUSD } from '../lib/utils'

type PieSlice = {
  name: string
  value: number
  color: string
  tarjetaUsdMonto?: number
}

export function DashboardPieChart({ data }: { data: PieSlice[] }) {
  if (data.length === 0) return <p className="text-gray-600 text-sm text-center py-10">Sin datos</p>
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={44} outerRadius={72} paddingAngle={2}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name, item) => {
              const p = item?.payload as PieSlice
              if (p?.tarjetaUsdMonto != null) {
                return [`${formatUSD(p.tarjetaUsdMonto)} (≈ ${formatARS(Number(value ?? 0))} al TC)`, name]
              }
              return [formatARS(Number(value ?? 0)), name]
            }}
            contentStyle={{ background: '#1b1b23', border: '1px solid rgba(70,69,85,0.6)', borderRadius: 12, fontSize: 12 }}
            itemStyle={{ color: '#e2e8f0' }}
            labelStyle={{ color: '#94a3b8' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-gray-400 truncate">{d.name}</span>
            </span>
            <span className="text-gray-200 font-medium shrink-0 text-right">
              {d.tarjetaUsdMonto != null ? formatUSD(d.tarjetaUsdMonto) : formatARS(d.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

type BarItem = { nombre: string; total: number; color: string }

export function DashboardBarChart({ data }: { data: BarItem[] }) {
  if (data.length === 0) return <p className="text-gray-600 text-sm text-center py-10">Sin gastos registrados</p>
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="nombre" width={90} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value) => formatARS(Number(value ?? 0))}
          contentStyle={{ background: '#1b1b23', border: '1px solid rgba(70,69,85,0.6)', borderRadius: 12, fontSize: 12 }}
          itemStyle={{ color: '#e2e8f0' }}
          labelStyle={{ color: '#94a3b8' }}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={18}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

type LineItem = { mes: string; Ingresos: number; Gastos: number }

export function DashboardLineChart({ data, anio }: { data: LineItem[]; anio: number }) {
  if (data.length <= 1) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
      className="hidden lg:block glass p-5 mt-4"
    >
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
        Evolución de los gastos — {anio}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2931" vertical={false} />
          <XAxis dataKey="mes" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip
            formatter={(value, name) => [formatARS(Number(value ?? 0)), String(name ?? '')]}
            contentStyle={{ background: '#1b1b23', border: '1px solid rgba(70,69,85,0.6)', borderRadius: 12, fontSize: 12 }}
            itemStyle={{ color: '#e2e8f0' }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }} />
          <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
