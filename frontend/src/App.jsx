import { useState } from "react";
import InputPage from "./components/InputPage";
import ResultsPage from "./components/ResultsPage";
import "./App.css";

export default function App() {
  const [report, setReport] = useState(null);

  return (
    <div className="app">
      {!report ? (
        <InputPage
          onResults={(data) => setReport(data)}
        />
      ) : (
        <ResultsPage
          report={report}
          setReport={setReport}
          onReset={() => setReport(null)}
        />
      )}
    </div>
  );
}
