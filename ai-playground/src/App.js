import React, {useState, useEffect} from 'react';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Header from './components/Header';
import Login from './components/Login';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import {getCurrentUser} from './services/authService';
import './App.css';

function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const currentUser = getCurrentUser();
        setUser(currentUser);
    }, []);

    return (
        <Router>
            <Header user={user} setUser={setUser}/>
            <div className="app-container">
                <Routes>
                    <Route path="/login" element={<Login setUser={setUser}/>}/>
                    <Route path="/projects/:projectId" element={<ProjectDetail/>}/>
                    <Route path="/" element={<ProjectList/>}/>
                    <Route path="*" element={<h2 style={{padding: '2rem'}}>404 - 페이지를 찾을 수 없습니다.</h2>}/>
                </Routes>
            </div>
        </Router>
    );
}

export default App;
