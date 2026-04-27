import api from "../api/axios.js";

export const loginUser = async (credentials: any) => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

export const signUpUser = async (userData: any) => {
  const response = await api.post("/auth/signup", userData);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get("/auth/profile");
  return response.data;
};
