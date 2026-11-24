import { useTheme } from '../theme';

const THEME_TEXT = { system: 'auto', light: 'light', dark: 'dark' };

export function Masthead() {
  const { theme, next, cycle } = useTheme();

  return (
    <header className="masthead">
      <div className="masthead-top">
        <span>Authentication flow with Node</span>
        <button type="button" className="text-button" onClick={cycle} aria-label={`Theme: ${theme}. Switch to ${next}`}>
          theme: {THEME_TEXT[theme]}
        </button>
      </div>
      <h1>OAuth Lab</h1>
      <p className="masthead-lede">
        A client, an auth server and a service, drawn as a sequence diagram. Log in, call the service, then click any
        arrow to read the HTTP message behind it.
      </p>
    </header>
  );
}
