import React from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {logout} from '../services/authService';
import './Header.css';

const Header = ({user, setUser}) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        setUser(null);
        navigate('/login');
    };

    return (
        <header className="header">
            <div className="header__left">
                <Link className="header__logo" to="/">ai-playground</Link>
            </div>
            <div className="header__right">
                {user ? (
                    <>
                        <span className="header__user">{user.username}</span>
                        <button className="header__button" onClick={handleLogout}>로그아웃</button>
                    </>
                ) : (
                    <Link className="header__button" to="/login">로그인</Link>
                )}
            </div>
        </header>
    );
};

export default Header;
