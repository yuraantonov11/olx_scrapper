import { MemoryRouter as Router, Route, Routes } from 'react-router-dom';
import ScriptRunner from './components/ScriptRunner';
import icon from '../../assets/icon.jpg';
import './App.css';

function Hello() {
  return (
    <div>
      <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div>
      <h1>Olx Data Scrapper</h1>
      <div className="Hello">
        <ScriptRunner />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
