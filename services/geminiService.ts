
import { GoogleGenAI, Type } from "@google/genai";
import { GradingResult } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ImagePart {
  base64: string;
  mime: string;
}

export const gradeWriting = async (images: ImagePart[]): Promise<GradingResult> => {
  const imageParts = images.map(img => ({
    inlineData: {
      data: img.base64,
      mimeType: img.mime,
    }
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          ...imageParts,
          {
            text: `Bạn là một chuyên gia khảo thí tiếng Anh IELTS Senior. 
Nhiệm vụ: Chấm điểm bài viết tay từ ${images.length} ảnh được cung cấp.

YÊU CẦU QUAN TRỌNG NHẤT:
1. RÀ SOÁT LỖI TỪNG CHỮ (WORD-BY-WORD): Tìm và liệt kê các lỗi sai về Ngữ pháp, Chính tả, Từ vựng và Văn phong.
2. BỎ QUA DẤU CÂU (PUNCTUATION): Tuyệt đối KHÔNG liệt kê bất kỳ lỗi nào liên quan đến dấu câu (dấu phẩy, dấu chấm, dấu chấm hỏi, dấu ngoặc kép...). Hãy coi như các dấu câu đều đã đúng hoặc không quan trọng.
3. BỎ QUA LỖI VIẾT HOA (CAPITALIZATION): Tuyệt đối KHÔNG liệt kê bất kỳ lỗi nào liên quan đến việc viết hoa hay viết thường (ví dụ: không viết hoa đầu câu, tên riêng, v.v.). Hãy coi như việc sử dụng chữ hoa/thường đã hoàn toàn chính xác.
4. KHÔNG TÓM TẮT: Liệt kê đầy đủ mọi lỗi tìm thấy (trừ lỗi dấu câu và lỗi viết hoa). Không bao giờ ghi "Và các lỗi khác...".
5. PHÂN LOẠI LỖI: Chỉ sử dụng các loại: Grammar, Spelling, Vocabulary, Style. (KHÔNG dùng Punctuation hay Capitalization).
6. CHẤM ĐIỂM: Khắt khe trên thang điểm 10.0 dựa trên các tiêu chí IELTS, đồng thời khoan dung hơn cho phần dấu câu và viết hoa.
7. NGÔN NGỮ PHẢN HỒI: Toàn bộ phần giải thích và nhận xét phải bằng TIẾNG VIỆT.

Định dạng JSON yêu cầu:
- isReadable: boolean (AI có đọc được không?)
- unreadableReason: string (Nếu không đọc được)
- recognizedText: string (Nội dung OCR toàn bộ bài viết)
- score: number
- errorCount: number
- errors: Array<{ wrong: string, correct: string, type: string, explanation: string }>
- sentenceAnalysis: Array<{ original: string, corrected: string, isCorrect: boolean, feedback: string }>. Phân tích câu dựa trên việc đã bỏ qua lỗi dấu câu và lỗi viết hoa.
- assessment: { strength: string, weakness: string, improvement: string }

Trả về DUY NHẤT mã JSON.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isReadable: { type: Type.BOOLEAN },
          unreadableReason: { type: Type.STRING },
          recognizedText: { type: Type.STRING },
          score: { type: Type.NUMBER },
          errorCount: { type: Type.INTEGER },
          sentenceAnalysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                isCorrect: { type: Type.BOOLEAN },
                feedback: { type: Type.STRING },
              },
              required: ["original", "corrected", "isCorrect", "feedback"],
            },
          },
          errors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                wrong: { type: Type.STRING },
                correct: { type: Type.STRING },
                type: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ["wrong", "correct", "type", "explanation"],
            },
          },
          assessment: {
            type: Type.OBJECT,
            properties: {
              strength: { type: Type.STRING },
              weakness: { type: Type.STRING },
              improvement: { type: Type.STRING },
            },
            required: ["strength", "weakness", "improvement"],
          },
        },
        required: ["isReadable", "recognizedText", "score", "errors", "sentenceAnalysis", "assessment"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Không thể kết nối với trí tuệ nhân tạo.");
  }

  try {
    const result = JSON.parse(response.text);
    result.errorCount = result.errors ? result.errors.length : 0;
    return result as GradingResult;
  } catch (e) {
    console.error("JSON Parse Error:", response.text);
    throw new Error("Dữ liệu phản hồi từ AI không hợp lệ.");
  }
};
