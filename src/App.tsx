import { useState } from "react";
import "./App.css";
import Login from "./components/login";
import Catalog from "./components/catalog";
import Cart from "./components/cart";

function App() {
  const [country, setCountry] = useState<"MY" | "US">("MY");
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(sessionStorage.getItem("xsolla_token")),
  );
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Xsolla Login Demo</h1>
        <div className="header-actions">
          {isLoggedIn && <Cart />}
          <Login onAuthChange={setIsLoggedIn} />
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
  );
}

export default App;
