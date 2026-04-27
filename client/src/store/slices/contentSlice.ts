import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface Content {
    id: string;
    title: string;
    body: string;
    createdAt: string;
}

interface ContentState {
    contents: Content[];
    selectedContent: Content | null;
    loading: boolean;
    error: string | null;
}

const initialState: ContentState = {
    contents: [],
    selectedContent: null,
    loading: false,
    error: null,
};

const contentSlice = createSlice({
    name: "content",
    initialState,
    reducers: {
        setContents: (state, action: PayloadAction<Content[]>) => {
            state.contents = action.payload;
            state.loading = false;
        },
        setSelectedContent: (state, action: PayloadAction<Content>) => {
            state.selectedContent = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.loading = false;
        }
    }
});

export const { setContents, setSelectedContent, setLoading, setError } = contentSlice.actions;
export default contentSlice.reducer;
