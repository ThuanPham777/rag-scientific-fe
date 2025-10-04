
export interface SummaryRequest {
    paperId: string;
    paperName: string;
    fileUrl?: string;
}

export interface SummaryResponse {
    summary: string;
    sections: {
        overview: string;
        objectives: string[];
        methodology: string;
        results: string[];
        contributions: string[];
        limitations: string[];
        futureWork: string[];
    };
}

// Mock API function - thay thế bằng API thực tế
export async function generatePaperSummary(request: SummaryRequest): Promise<SummaryResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock response - trong thực tế sẽ gọi API backend
    return {
        summary: `# Tóm tắt bài báo: ${request.paperName}

## 📋 Tổng quan
Đây là một bài báo nghiên cứu về lĩnh vực khoa học máy tính, tập trung vào việc phát triển các thuật toán và phương pháp mới để giải quyết các vấn đề phức tạp trong thực tế.

## 🎯 Mục tiêu chính
- Mục tiêu chính của nghiên cứu là phát triển một hệ thống AI mới
- Giải quyết vấn đề về độ chính xác và hiệu suất
- Đề xuất phương pháp tiếp cận sáng tạo

## 🔬 Phương pháp nghiên cứu
- Sử dụng phương pháp thực nghiệm với dataset lớn
- Thu thập dữ liệu từ nhiều nguồn khác nhau
- Phân tích và đánh giá kết quả bằng các metric chuẩn

## 📊 Kết quả chính
- Đạt được độ chính xác 95% trên test set
- Cải thiện hiệu suất 30% so với các phương pháp trước
- Có thể áp dụng trong nhiều lĩnh vực thực tế

## 💡 Đóng góp
- Đề xuất thuật toán mới với độ phức tạp thấp
- Cung cấp dataset công khai cho cộng đồng
- Mở ra hướng nghiên cứu mới trong lĩnh vực

## ⚠️ Hạn chế
- Chỉ test trên dataset tiếng Anh
- Cần thêm thời gian để đánh giá lâu dài
- Có thể cải thiện thêm về tốc độ xử lý

## 🔮 Hướng phát triển
- Mở rộng sang các ngôn ngữ khác
- Tối ưu hóa thuật toán cho mobile
- Phát triển ứng dụng thực tế trong production`,

        sections: {
            overview: "Đây là một bài báo nghiên cứu về lĩnh vực khoa học máy tính, tập trung vào việc phát triển các thuật toán và phương pháp mới để giải quyết các vấn đề phức tạp trong thực tế.",
            objectives: [
                "Phát triển một hệ thống AI mới",
                "Giải quyết vấn đề về độ chính xác và hiệu suất",
                "Đề xuất phương pháp tiếp cận sáng tạo"
            ],
            methodology: "Sử dụng phương pháp thực nghiệm với dataset lớn, thu thập dữ liệu từ nhiều nguồn khác nhau và phân tích bằng các metric chuẩn.",
            results: [
                "Đạt được độ chính xác 95% trên test set",
                "Cải thiện hiệu suất 30% so với các phương pháp trước",
                "Có thể áp dụng trong nhiều lĩnh vực thực tế"
            ],
            contributions: [
                "Đề xuất thuật toán mới với độ phức tạp thấp",
                "Cung cấp dataset công khai cho cộng đồng",
                "Mở ra hướng nghiên cứu mới trong lĩnh vực"
            ],
            limitations: [
                "Chỉ test trên dataset tiếng Anh",
                "Cần thêm thời gian để đánh giá lâu dài",
                "Có thể cải thiện thêm về tốc độ xử lý"
            ],
            futureWork: [
                "Mở rộng sang các ngôn ngữ khác",
                "Tối ưu hóa thuật toán cho mobile",
                "Phát triển ứng dụng thực tế trong production"
            ]
        }
    };
}

// Function để lưu summary vào localStorage (tạm thời)
export function saveSummaryToStorage(paperId: string, summary: SummaryResponse) {
    const key = `paper_summary_${paperId}`;
    localStorage.setItem(key, JSON.stringify(summary));
}

// Function để load summary từ localStorage
export function loadSummaryFromStorage(paperId: string): SummaryResponse | null {
    const key = `paper_summary_${paperId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
}
