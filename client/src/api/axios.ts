import axios from "axios";

const baseURL = "http://localhost:5000/api";

const api = axios.create({
  baseURL,
  withCredentials: true, // Crucial for cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for logging/custom headers
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for unified error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || "An unexpected error occurred";
    console.error("API Error:", message);
    return Promise.reject(new Error(message));
  }
);

export default api;
