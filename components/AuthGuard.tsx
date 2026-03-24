import { Redirect, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, hasHousehold, loading } = useAuth();
  const segments = useSegments() as string[];

  if (loading) return null;

  const inAuth = segments[0] === '(auth)';
  const inHouseholdSetup = segments[1] === 'household-setup';

  return (
    <>
      {/* Sem sessão fora do grupo auth → login */}
      {!session && !inAuth && <Redirect href="/(auth)/login" />}

      {/* Com sessão no grupo auth → sair para a app */}
      {session && hasHousehold === true && inAuth && <Redirect href="/(app)/dashboard" />}

      {/* Com sessão mas sem household → setup (fora do próprio setup) */}
      {session && hasHousehold === false && !inHouseholdSetup && (
        <Redirect href="/(app)/household-setup" />
      )}

      {/* Com household mas ainda no setup → dashboard */}
      {session && hasHousehold === true && inHouseholdSetup && (
        <Redirect href="/(app)/dashboard" />
      )}

      {children}
    </>
  );
}
