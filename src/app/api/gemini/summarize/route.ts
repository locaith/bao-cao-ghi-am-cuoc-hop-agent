import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, audio, mimeType } = body;

    if (!text && !audio) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp tệp ghi âm hoặc văn bản cuộc họp.' },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    let contents: any;

    const basePrompt = `Bạn là một Thư ký điều hành cấp cao kiêm Giám đốc Vận hành AI (Chief of Staff AI) với hơn 15 năm kinh nghiệm quản lý dự án và điều hành doanh nghiệp. 
Nhiệm vụ của bạn là phân tích sâu sắc nội dung thảo luận cuộc họp (qua bản dịch âm thanh hoặc ghi chú văn bản được cung cấp) để lập Biên Bản Cuộc Họp (Meeting Minutes) đạt chuẩn doanh nghiệp toàn cầu và đề xuất kế hoạch hành động chiến lược tiếp theo.

Hãy tạo ra một báo cáo phân tích toàn diện, súc tích, mạch lạc bằng Tiếng Việt và trả về dưới dạng một đối tượng JSON chuẩn chỉnh với cấu trúc chi tiết dưới đây:
{
  "title": "Tiêu đề cuộc họp chuyên nghiệp, súc tích (ví dụ: 'Cập nhật Tiến độ & Định hướng Phát triển Sản phẩm X')",
  "summary": "Tóm tắt điều hành (Executive Summary) vô cùng chuyên nghiệp, tập trung vào mục tiêu cốt lõi, các quyết định chiến lược đã được thông qua, và không khí chung của cuộc họp (khoảng 150-250 từ, hành văn gãy gọn, học thuật, không rườm rà).",
  "keyPoints": [
    "Điểm thảo luận chính 1: Ghi nhận bối cảnh, luận điểm tranh luận và kết luận thống nhất",
    "Điểm thảo luận chính 2: Chi tiết về các giải pháp kỹ thuật/kinh doanh được đưa ra thảo luận"
  ],
  "tasks": [
    {
      "title": "Tên và mô tả công việc cụ thể cần thực hiện",
      "assignee": "Tên người chịu trách nhiệm (nếu không được nhắc tên cụ thể, phân tích ngữ cảnh để phán đoán hoặc ghi 'Chưa phân công')",
      "deadline": "Hạn chót hoàn thành dưới dạng YYYY-MM-DD (nếu không thống nhất cụ thể trong cuộc họp, hãy đề xuất một mốc thời gian thực tế, khả thi dựa trên mức độ khẩn cấp của công việc và thời gian hiện tại)",
      "priority": "Độ ưu tiên cực kỳ logic dựa trên rủi ro dự án: 'High', 'Medium', hoặc 'Low'"
    }
  ],
  "recommendations": [
    {
      "title": "Tên gợi ý hành động/bước tiếp theo tối ưu (Next Steps / Tactical Advice)",
      "description": "Mô tả chi tiết và sâu sắc lý do tại sao đội ngũ nên làm điều này, phương pháp thực hiện tối ưu để giải quyết dứt điểm rủi ro hoặc nắm bắt cơ hội từ cuộc họp",
      "priority": "Độ quan trọng chiến lược: 'High', 'Medium', hoặc 'Low'"
    }
  ]
}

YÊU CẦU QUAN TRỌNG:
1. Thông tin phải hoàn toàn xác thực, dựa trên dữ liệu được thảo luận, tuyệt đối không được thêm bớt thông tin sai lệch ngoài thực tế.
2. Các gợi ý hành động (recommendations) phải thực sự sáng tạo, mang tính tư vấn cấp cao, giúp tối ưu hóa luồng công việc sau cuộc họp.
3. Phản hồi CHỈ chứa duy nhất một đối tượng JSON hợp lệ, không bọc trong ký tự markdown \`\`\`json hay bất cứ văn bản rác nào khác để tránh lỗi phân tích cú pháp.`;

    if (audio) {
      // Audio-based summarization using inlineData
      contents = [
        {
          inlineData: {
            mimeType: mimeType || 'audio/webm',
            data: audio, // base64 string
          },
        },
        {
          text: basePrompt,
        },
      ];
    } else {
      // Text-based summarization
      contents = `${basePrompt}\n\nNội dung văn bản ghi âm/cuộc họp:\n${text}`;
    }

    const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError: any = null;
    let responseText = '';

    for (const modelName of modelsToTry) {
      try {
        console.log(`Đang gọi Gemini API sử dụng model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          responseText = response.text;
          console.log(`Thành công sử dụng model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Lỗi khi sử dụng model ${modelName}:`, err.message || err);
        // Tiếp tục thử model dự phòng tiếp theo
      }
    }

    if (!responseText) {
      throw lastError || new Error('Không nhận được phản hồi từ bất kỳ mô hình Gemini nào.');
    }

    // Làm sạch chuỗi JSON nếu có code block markdown bao bọc ngoài ý muốn
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    // Parse JSON
    const parsedData = JSON.parse(cleanText);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Lỗi khi xử lý tổng hợp bằng Gemini API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi hệ thống khi xử lý AI tổng hợp.' },
      { status: 500 }
    );
  }
}
