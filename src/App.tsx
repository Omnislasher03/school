import { useState } from "react";
import "./App.css";
import Login from "./components/login";
import Catalog from "./components/catalog";
import Cart, { CartProvider } from "./components/cart";

function App() {
  const [country, setCountry] = useState<"MY" | "US">("MY");
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("xsolla_token"),
  );
  const isLoggedIn = Boolean(token);

  return (
    <CartProvider key={token ?? "logged-out"} token={token}>
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Xsolla Login Demo</h1>
        <div className="header-actions">
          {isLoggedIn && <Cart />}
          <Login onAuthChange={setToken} />
        </div>
      </header>
      <main className="app-main">
        <Catalog
          isLoggedIn={isLoggedIn}
          country={country}
          onCountryChange={setCountry}
        />
      </main>
    </div>
    </CartProvider>
  );
}

export default App;
