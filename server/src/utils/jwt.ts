import jwt from "jsonwebtoken";

export const generateUserJWT = (userId: string) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || "default_secret", {
        expiresIn: "7d",
    });
};
