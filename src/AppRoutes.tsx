import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import Landing from './Landing'

const ForgeApp = lazy(() => import('./forge/App'))
const OnlineApp = lazy(() => import('./online/OnlineApp'))

function AppFallback() {
  return (
    <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center">
      <p className="font-display text-lg text-ether-200">Cargando…</p>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/card-maker"
        element={
          <Suspense fallback={<AppFallback />}>
            <ForgeApp />
          </Suspense>
        }
      />
      <Route
        path="/epiconline"
        element={
          <Suspense fallback={<AppFallback />}>
            <OnlineApp />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
