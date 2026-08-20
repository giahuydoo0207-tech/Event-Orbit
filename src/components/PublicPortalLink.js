import React from 'react';
import { Link } from 'react-router-dom';
import { getPublicPortalLink } from '../lib/publicPortalNavigation.js';

export function PublicPortalLink({ session, pathname }) {
  const portalLink = getPublicPortalLink(session, pathname);
  if (!portalLink) return null;

  return React.createElement(
    Link,
    {
      to: portalLink.to,
      className: 'text-xs font-bold text-oc-blue hover:underline transition-colors',
    },
    portalLink.label,
  );
}
