import React, {useState} from 'react';
import {login} from '../services/authService';
import {useNavigate} from 'react-router-dom';
import './Login.css';

const Login = ({setUser}) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userData = await login(username, password);
            setUser(userData);
            navigate('/');
        } catch (err) {
            alert('로그인 실패: ' + err.message);
        }
    };

    return (
        <div className="login">
            <div className="login__card">
                <h2 className="login__title">로그인</h2>
                <form className="login__form" onSubmit={handleSubmit}>
                    <div className="login__group">
                        <label className="login__label">사용자명:</label>
                        <input className="login__input" type="text" value={username}
                               onChange={(e) => setUsername(e.target.value)} required/>
                    </div>
                    <div className="login__group">
                        <label className="login__label">비밀번호:</label>
                        <input className="login__input" type="password" value={password}
                               onChange={(e) => setPassword(e.target.value)} required/>
                    </div>
                    <button className="login__button" type="submit">로그인</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
