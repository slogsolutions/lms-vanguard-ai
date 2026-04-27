import validator from "validator";

export const validateSignUpData = (data: any) => {
    const { name, email, password } = data;
    if (!name || !email || !password) {
        throw new Error("All fields are required");
    }
    if (!validator.isEmail(email)) {
        throw new Error("Invalid email format");
    }
    if (!validator.isLength(password, { min: 6 })) {
        throw new Error("Password must be at least 6 characters long");
    }
};
