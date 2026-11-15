import "./App.css";
import Login from "./components/login";

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Xsolla Login Demo</h1>
        <Login />
      </header>
      <main className="app-main">
        <p className="welcome">Welcome, guest</p>
      </main>
    </div>
  );
}

export default App;
