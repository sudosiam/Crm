import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { LoadingState } from './components/ui/LoadingState'
import { useApp } from './context/AppContext'
import { CustomerDetailPage } from './pages/CustomerDetailPage'
import { CustomerFormPage } from './pages/CustomerFormPage'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { FollowUpsPage } from './pages/FollowUpsPage'
import { ForgotPage } from './pages/ForgotPage'
import { LoginPage } from './pages/LoginPage'
import { MorePage } from './pages/MorePage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SalesPage } from './pages/SalesPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetupPage } from './pages/SetupPage'
import { TestRidesPage } from './pages/TestRidesPage'

function Gate({ children }: { children: ReactNode }) {
  const { ready, user, workspace, configError } = useApp()
  if (configError) {
    return <main className="mx-auto max-w-md px-5 py-16"><h1 className="page-title">BPH cannot start</h1><p className="mt-3">{configError}</p></main>
  }
  if (!ready) return <main className="grid min-h-dvh place-items-center"><LoadingState label="Loading BPH…" /></main>
  if (!user) return <Navigate to="/login" replace />
  if (!workspace) return <Navigate to="/setup" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot" element={<ForgotPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route element={<Gate><AppShell /></Gate>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/new" element={<CustomerFormPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
        <Route path="/follow-ups" element={<FollowUpsPage />} />
        <Route path="/test-rides" element={<TestRidesPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
