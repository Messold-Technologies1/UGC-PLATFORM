import axios from "axios";
import { toast } from "sonner";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      toast.error("Session expired", { description: "Please log in again." });
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
