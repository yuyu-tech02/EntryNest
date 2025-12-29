import { Navigate } from 'react-router-dom';
import Layout from './Layout';

/**
 * Checks if user needs to complete profile setup.
 * @param {Object} user - User object
 * @returns {boolean}
 */
function needsProfileSetup(user) {
  return user && user.display_name === '就活 太郎' && user.graduation_year === '2026年卒';
}

/**
 * ProtectedRoute - Wraps routes that require authentication.
 * Handles authentication check and profile setup redirect.
 *
 * @param {Object} props
 * @param {Object} props.user - Current user object (null if not authenticated)
 * @param {Function} props.onLogout - Logout handler function
 * @param {React.ReactNode} props.children - Child components to render
 * @param {boolean} [props.withLayout=true] - Whether to wrap children with Layout
 */
export default function ProtectedRoute({ user, onLogout, children, withLayout = true }) {
  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Needs profile setup - redirect to setup page
  if (needsProfileSetup(user)) {
    return <Navigate to="/profile-setup" replace />;
  }

  // Authenticated and profile complete
  if (withLayout) {
    return (
      <Layout user={user} onLogout={onLogout}>
        {children}
      </Layout>
    );
  }

  return children;
}

/**
 * PublicRoute - Wraps routes that should only be accessible to unauthenticated users.
 * Redirects authenticated users to home or profile setup.
 *
 * @param {Object} props
 * @param {Object} props.user - Current user object (null if not authenticated)
 * @param {React.ReactNode} props.children - Child components to render
 */
export function PublicRoute({ user, children }) {
  if (!user) {
    return children;
  }

  // Authenticated user - redirect to profile setup or home
  if (needsProfileSetup(user)) {
    return <Navigate to="/profile-setup" replace />;
  }

  return <Navigate to="/" replace />;
}

/**
 * ProfileSetupRoute - Special route for profile setup page.
 * Only accessible to authenticated users who haven't completed setup.
 *
 * @param {Object} props
 * @param {Object} props.user - Current user object (null if not authenticated)
 * @param {React.ReactNode} props.children - Child components to render
 */
export function ProfileSetupRoute({ user, children }) {
  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Profile already complete - redirect to home
  if (!needsProfileSetup(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
