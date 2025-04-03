export const login = async (username, password) => {
    // 실제 API 호출 시 백엔드로 POST 요청 후 받은 토큰 저장
    // 여기서는 간단하게 성공했다고 가정
    const userData = {username, token: 'dummy-token'};
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
};

export const logout = () => {
    localStorage.removeItem('user');
};

export const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem('user'));
};
