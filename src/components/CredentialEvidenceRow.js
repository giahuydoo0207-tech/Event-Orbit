import React from 'react';
import { hasRealTransaction } from '../lib/credentialPresentation.js';

export function CredentialEvidenceRow({ achievement }) {
  const hasTransaction = hasRealTransaction(achievement);
  return React.createElement(
    'tr',
    { className: 'hover:bg-slate-50/50' },
    React.createElement('td', { className: 'p-4 font-semibold text-navy' }, achievement.eventName),
    React.createElement('td', { className: 'p-4 text-success font-bold' }, `+${achievement.points} pts`),
    React.createElement(
      'td',
      { className: 'p-4' },
      hasTransaction
        ? React.createElement(
            'a',
            {
              href: `https://edu-chain-testnet.blockscout.com/tx/${achievement.txHash}`,
              target: '_blank',
              rel: 'noreferrer',
              className: 'font-mono text-accent-blue hover:underline',
            },
            `${achievement.txHash.substring(0, 10)}...${achievement.txHash.substring(achievement.txHash.length - 4)}`,
          )
        : React.createElement('span', { className: 'text-text-secondary' }, 'Not available'),
    ),
  );
}
