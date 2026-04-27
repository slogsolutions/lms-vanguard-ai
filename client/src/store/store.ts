import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice.js";
import contentReducer from "./slices/contentSlice.js";
import chatReducer from "./slices/chatSlice.js";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        content: contentReducer,
        chat: chatReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
