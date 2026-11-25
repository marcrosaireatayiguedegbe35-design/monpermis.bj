import { Navigate, Outlet } from 'react-router-dom'
import { useMoniteurAuth } from '../context/MoniteurAuthContext'
import { ChangePasswordPage } from '../pages/ChangePasswordPage'
import { OnboardingPage } from '../pages/OnboardingPage'

export function ProtectedRoute() {
  const { moniteur, loading } = useMoniteurAuth()

  if (loading) {
    return (
      <div className="loader-screen">
        <div className="loader-dot" />
        <p>Chargement…</p>
      </div>
    )
  }

  if (!moniteur) return <Navigate to="/connexion" replace />

  // Mot de passe provisoire donné par l'administration : à remplacer avant d'accéder à l'espace.
  if (moniteur.mustChangePassword) return <ChangePasswordPage />

  // Compte tout neuf : photo de profil, véhicule puis horaires avant d'arriver sur le tableau de bord.
  if (moniteur.needsOnboarding) return <OnboardingPage />

  return <Outlet />
}
