import axios from "axios";
import { toast } from "sonner";

const api = axios.create({
  withCredentials: true,
});

if (typeof window !== "undefined") {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        toast.error("Session expired", {
          id: "session-expired",
          description: "Please log in again.",
        });
        window.location.href = "/login";
      }
      return Promise.reject(error);
    },
  );
}

export default api;
