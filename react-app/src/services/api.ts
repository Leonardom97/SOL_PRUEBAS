import axios from 'axios';

const api = axios.create({
    baseURL: '', // Relative to root, handled by Vite Proxy
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important for PHP Sessions
});

// Response interceptor to handle session expiration or errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Handle unauthorized access (e.g., redirect to login)
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
