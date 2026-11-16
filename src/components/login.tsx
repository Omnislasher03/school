import { useEffect, useRef, useState } from "react";
import { Widget } from "@xsolla/login-sdk";

const token_key = "xsolla_token";

type LoginProps = {
  onAuthChange: (loggedIn: boolean) => void;
};

export default function Login({ onAuthChange }: LoginProps) {
  const widgetRef = useRef<Widget | null>(null);
  const [token, setToken] = useState(() => sessionStorage.getItem(token_key));
  const [error, setError] = useState("");

  useEffect(() => {
    onAuthChange(Boolean(token));
    const params = new URLSearchParams(window.location.search);
    const returnedToken = params.get("token");

    if (!returnedToken) return;

    sessionStorage.setItem(token_key, returnedToken);
    setToken(returnedToken);

    // Remove the token from the address bar after reading it
    params.delete("token");
    const query = params.toString();
    const cleanUrl =
      window.location.pathname +
      (query ? `?${query}` : "") +
      window.location.hash;

    window.history.replaceState({}, "", cleanUrl);
  }, [token, onAuthChange]);

  const handleLogin = () => {
    const projectId = import.meta.env.VITE_XSOLLA_LOGIN_PROJECT_ID;
    const callbackUrl = import.meta.env.VITE_XSOLLA_CALLBACK_URL;

    if (!projectId || !callbackUrl) {
      setError("Set the Xsolla Prohject ID and callback URL in .env");
      return;
    }

    if (!widgetRef.current) {
      const widget = new Widget({
        projectId,
        callbackUrl,
        preferredLocale: "en_US",
      });

      widget.mount("xl_auth");
      widgetRef.current = widget;
    }

    setError("");
    widgetRef.current.open();
  };

  const handleLogout = () => {
    sessionStorage.removeItem(token_key);
    setToken(null);
  };

  return (
    <>
      <div id="xl_auth" />
      {token ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleLogout}
        >
          Log Out
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={handleLogin}>
          Login
        </button>
      )}

      {error && <p role="alert">{error}</p>}
    </>
  );
}
