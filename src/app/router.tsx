// =============================================================
// Routeur principal — React Router v6
//
// Structure des routes :
//   /                   → redirect selon rôle
//   /connexion          → login commun
//   /sudo               → login secret Sudo
//   /sudo/*             → espace Sudo (isolé de l'Admin)
//   /admin/*            → espace Admin
//   /technicien/*       → espace Technicien
//   /entreprise/*       → espace Entreprise
// =============================================================
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/shared/ProtectedRoute'

// ----- Auth -----
import { LoginPage } from '../features/auth/pages/LoginPage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage'

// ----- Sudo -----
import { SudoLoginPage } from '../features/auth/pages/SudoLoginPage'
import { SudoLayout } from '../components/layout/SudoLayout'
import { SudoDashboardPage } from '../features/dashboard/pages/SudoDashboardPage'
import { SudoUsersPage } from '../features/sudo/pages/SudoUsersPage'
import { SudoInterventionsPage } from '../features/sudo/pages/SudoInterventionsPage'
import { SudoEquipmentPage } from '../features/sudo/pages/SudoEquipmentPage'
import { SudoParametresPage } from '../features/sudo/pages/SudoParametresPage'

// ----- Admin -----
import { AdminLayout } from '../components/layout/AdminLayout'
import { AdminDashboardPage } from '../features/dashboard/pages/AdminDashboardPage'
import { UsersPage } from '../features/users/pages/UsersPage'
import { EquipmentAdminPage } from '../features/equipment/pages/EquipmentAdminPage'
import { InterventionsAdminPage } from '../features/interventions/pages/InterventionsAdminPage'
import { ContractsPage } from '../features/contracts/pages/ContractsPage'
import { MessagingPage } from '../features/messaging/pages/MessagingPage'
import { AuditLogsPage } from '../features/audit/pages/AuditLogsPage'

// ----- Technicien -----
import { TechnicienLayout } from '../components/layout/TechnicienLayout'
import { TechnicienDashboardPage } from '../features/dashboard/pages/TechnicienDashboardPage'
import { InterventionsTechPage } from '../features/interventions/pages/InterventionsTechPage'
import { InterventionDetailPage } from '../features/interventions/pages/InterventionDetailPage'
import { ScanPage } from '../features/equipment/pages/ScanPage'
import { EquipmentPassportPage } from '../features/equipment/pages/EquipmentPassportPage'

// ----- Entreprise -----
import { EntrepriseLayout } from '../components/layout/EntrepriseLayout'
import { EntrepriseDashboardPage } from '../features/dashboard/pages/EntrepriseDashboardPage'
import { ParcPage } from '../features/equipment/pages/ParcPage'
import { InterventionsEntreprisePage } from '../features/interventions/pages/InterventionsEntreprisePage'

// ----- Partagé -----
import { ProfilePage } from '../features/users/pages/ProfilePage'
import { NotFoundPage } from '../components/shared/NotFoundPage'
import { RootRedirect } from '../components/shared/RootRedirect'
import { PublicLandingPage } from '../features/public/pages/PublicLandingPage'
import { RouteError } from '../components/shared/RouteError'

export const router = createBrowserRouter([
  // Redirect racine selon rôle ou page publique
  { path: '/', element: <RootRedirect />, errorElement: <RouteError /> },
  { path: '/accueil', element: <PublicLandingPage />, errorElement: <RouteError /> },

  // Auth publique
  { path: '/connexion', element: <LoginPage />, errorElement: <RouteError /> },
  { path: '/inscription', element: <RegisterPage />, errorElement: <RouteError /> },
  { path: '/mot-de-passe-oublie', element: <ForgotPasswordPage />, errorElement: <RouteError /> },
  { path: '/reinitialiser-mot-de-passe', element: <ResetPasswordPage />, errorElement: <RouteError /> },

  // Login secret Sudo
  { path: '/sudo', element: <SudoLoginPage /> },

  // ── Espace Sudo (isolé de l'Admin) ──────────────────────────
  {
    path: '/sudo',
    element: (
      <ProtectedRoute allowedRoles={['super_admin']}>
        <SudoLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    children: [
      { path: 'dashboard',     element: <SudoDashboardPage /> },
      { path: 'utilisateurs',  element: <SudoUsersPage /> },
      { path: 'interventions', element: <SudoInterventionsPage /> },
      { path: 'interventions/:id', element: <InterventionDetailPage /> },
      { path: 'equipements',   element: <SudoEquipmentPage /> },
      { path: 'historique',    element: <AuditLogsPage /> },
      { path: 'equipements/:id', element: <EquipmentPassportPage /> },
      { path: 'profil',        element: <ProfilePage /> },
      { path: 'parametres',    element: <SudoParametresPage /> },
      { path: 'scanner',        element: <ScanPage /> },
    ],
  },

  // ── Espace Admin (admin uniquement) ─────────────────────────
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',        element: <AdminDashboardPage /> },
      { path: 'utilisateurs',     element: <UsersPage /> },
      { path: 'equipements',      element: <EquipmentAdminPage /> },
      { path: 'equipements/:id',  element: <EquipmentPassportPage /> },
      { path: 'scanner',          element: <ScanPage /> },
      { path: 'interventions',    element: <InterventionsAdminPage /> },
      { path: 'interventions/:id', element: <InterventionDetailPage /> },
      { path: 'contrats',         element: <ContractsPage /> },
      { path: 'messagerie',       element: <MessagingPage /> },
      { path: 'historique',       element: <AuditLogsPage /> },
      { path: 'profil',           element: <ProfilePage /> },
    ],
  },

  // ── Espace Technicien ────────────────────────────────────────
  {
    path: '/technicien',
    element: (
      <ProtectedRoute allowedRoles={['technicien']}>
        <TechnicienLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',        element: <TechnicienDashboardPage /> },
      { path: 'interventions',    element: <InterventionsTechPage /> },
      { path: 'interventions/:id', element: <InterventionDetailPage /> },
      { path: 'scanner',          element: <ScanPage /> },
      { path: 'equipement/:id',   element: <EquipmentPassportPage /> },
      { path: 'messagerie',       element: <MessagingPage /> },
      { path: 'profil',           element: <ProfilePage /> },
    ],
  },

  // ── Espace Entreprise ────────────────────────────────────────
  {
    path: '/entreprise',
    element: (
      <ProtectedRoute allowedRoles={['client']}>
        <EntrepriseLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',        element: <EntrepriseDashboardPage /> },
      { path: 'parc',             element: <ParcPage /> },
      { path: 'parc/:id',         element: <EquipmentPassportPage /> },
      { path: 'interventions',    element: <InterventionsEntreprisePage /> },
      { path: 'interventions/:id', element: <InterventionDetailPage /> },
      { path: 'messagerie',       element: <MessagingPage /> },
      { path: 'profil',           element: <ProfilePage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
