'use client';

import { LinkedProvider, useLinked } from '@/providers/linked';
import { UserProvider } from '@/providers/user';

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { state } = useLinked();
	console.log(state)
  if (!state.alreadyLinked) {
    return <>abc</>
  }

  return <AuthenticatedApp>{children}</AuthenticatedApp>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LinkedProvider>
          <AppContent>{children}</AppContent>
        </LinkedProvider>
      </body>
    </html>
  );
}