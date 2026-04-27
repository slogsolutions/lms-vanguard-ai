import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
}

interface Chat {
    id: string;
    createdAt: string;
    messages?: Message[];
}

interface ChatState {
    chats: Chat[];
    activeChatId: string | null;
    messages: Message[];
    loading: boolean;
    error: string | null;
}

const initialState: ChatState = {
    chats: [],
    activeChatId: null,
    messages: [],
    loading: false,
    error: null,
};

const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        setChats: (state, action: PayloadAction<Chat[]>) => {
            state.chats = action.payload;
        },
        setActiveChat: (state, action: PayloadAction<string>) => {
            state.activeChatId = action.payload;
        },
        setMessages: (state, action: PayloadAction<Message[]>) => {
            state.messages = action.payload;
            state.loading = false;
        },
        addMessage: (state, action: PayloadAction<Message>) => {
            state.messages.push(action.payload);
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        }
    }
});

export const { setChats, setActiveChat, setMessages, addMessage, setLoading } = chatSlice.actions;
export default chatSlice.reducer;
