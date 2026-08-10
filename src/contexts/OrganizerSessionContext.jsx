import React, { createContext, useContext } from 'react';

const OrganizerSessionContext = createContext(null);

export function OrganizerSessionProvider({ session, children }) {
  return (
    <OrganizerSessionContext.Provider value={session}>
      {children}
    </OrganizerSessionContext.Provider>
  );
}

export function useOrganizerSession() {
  return useContext(OrganizerSessionContext);
}
