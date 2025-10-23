import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "./env";

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 500000, // 500s
    headers: {
        "Content-Type": "application/json",
    },
});

// =========================
// 🔹 Request Interceptor
// =========================
api.interceptors.request.use(
    (config) => {
        // Thêm token nếu có (tùy bạn đang lưu ở đâu)
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Log để debug (có thể tắt ở production)
        // console.log(`[Axios Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// =========================
// 🔹 Response Interceptor
// =========================
api.interceptors.response.use(
    (response) => {
        // Trả về data luôn cho ngắn gọn
        return response;
    },
    (error: AxiosError) => {
        if (error.response) {
            const { status, data } = error.response;

            // 👇 Tùy chọn xử lý lỗi toàn cục
            if (status === 401) {
                console.warn("⚠️ Unauthorized — maybe token expired?");
                // Ví dụ: redirect về login
                // window.location.href = "/login";
            }

            if (status >= 500) {
                console.error("💥 Server error:", data);
            }

            // Có thể show toast nếu muốn
            // toast.error(`Error ${status}: ${data?.message ?? "Unknown error"}`);
        } else if (error.request) {
            console.error("❌ No response from server:", error.message);
        } else {
            console.error("❌ Axios config error:", error.message);
        }

        return Promise.reject(error);
    }
);

export default api;
