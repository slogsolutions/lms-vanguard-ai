import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setUser, setLoading, logout } from "../store/slices/authSlice.js";
import { getProfile } from "../services/authService.js";

export const useAuth = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const checkAuth = async () => {
            dispatch(setLoading(true));
            try {
                const response = await getProfile();
                if (response.success) {
                    dispatch(setUser(response.data));
                } else {
                    dispatch(logout());
                }
            } catch (error) {
                dispatch(logout());
            } finally {
                dispatch(setLoading(false));
            }
        };

        checkAuth();
    }, [dispatch]);
};
