import React from 'react';
import { checkPasswordRules, passwordStrength } from '../../utils/passwordRules';

/**
 * Strength meter and rule checklist under a new-password field. It only takes
 * up space while the password still needs work: hidden when the field is empty
 * (unless `showErrors`) and hidden again once every rule passes.
 * `showErrors` highlights unmet rules in red (e.g. after a submit attempt).
 */
export const PasswordChecklist = ({ password, showErrors = false }) => {
  const rules = checkPasswordRules(password);
  const allPassed = rules.every((rule) => rule.passed);
  if (allPassed || (!password && !showErrors)) return null;

  const strength = passwordStrength(password);

  return (
    <div id="password-rules" aria-live="polite" style={{ marginTop: '8px' }}>
      {password && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ height: '6px', borderRadius: '999px', background: '#f1ebe7', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${strength.percent}%`, background: strength.color, transition: 'width 0.2s, background 0.2s' }} />
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: strength.color, marginTop: '4px' }}>
            Password strength: {strength.label}
          </div>
        </div>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '4px 12px' }}>
        {rules.map((rule) => {
          const color = rule.passed ? '#15803d' : showErrors ? '#b91c1c' : '#8c7e77';
          return (
            <li
              key={rule.id}
              aria-label={`${rule.label}: ${rule.passed ? 'done' : 'missing'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color, fontWeight: rule.passed ? 600 : 500 }}
            >
              <span aria-hidden="true" style={{ width: '16px', height: '16px', flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', fontSize: '10px', fontWeight: 900, background: rule.passed ? '#dcfce7' : showErrors ? '#fee2e2' : '#f1ebe7', color }}>
                {rule.passed ? '✓' : showErrors ? '✕' : '•'}
              </span>
              <span aria-hidden="true">{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordChecklist;
