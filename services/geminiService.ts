
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
            text: `Bạn là một giáo viên tiếng Anh tại trung tâm Anh ngữ, có phong cách nhận xét chuyên môn cực kỳ chi tiết, trực diện và dễ hiểu.

NHIỆM VỤ: Phân tích bài làm từ ${images.length} ảnh và viết báo cáo cho phụ huynh.

YÊU CẦU VỀ GIỌNG VĂN (MÔ PHỎNG CHÍNH XÁC):
Phải viết đoạn 'parentReport' theo đúng cấu trúc và văn phong sau:
1. Sử dụng từ "Con" để gọi học sinh.
2. Cấu trúc nội dung: [Điểm kiến thức con đã làm tốt] -> [Lỗi sai cụ thể con thường gặp] -> [Ví dụ thực tế từ bài làm kèm sửa lỗi] -> [Giải thích quy tắc bằng tiếng Việt đơn giản].
3. Ví dụ mẫu bạn cần bắt chước: "Con đã nắm chắc cách dùng 'Do' và 'Does' đi kèm với các chủ ngữ như 'I, you, we, they, he, she, it'. Tuy nhiên, con thường xuyên quên thêm 's' hoặc 'es' vào sau tên các đồ vật hoặc con vật khi đặt câu hỏi chung (ví dụ: thay vì hỏi 'Con có thích lê không?' - Do you like pears - thì con lại chỉ viết là 'pear'). Con lưu ý khi hỏi về sở thích đối với một loại đồ vật nào đó nói chung, phải dùng dạng số nhiều của từ đó."

CÁC QUY TẮC NGHIÊM NGẶT:
- TUYỆT ĐỐI KHÔNG chào hỏi (Không: "Chào phụ huynh", "Kính gửi...").
- TUYỆT ĐỐI KHÔNG hứa hẹn (Không: "Sắp tới cô sẽ...", "Trung tâm sẽ...").
- TUYỆT ĐỐI KHÔNG chúc tụng (Không: "Chúc con học tốt", "Hẹn gặp lại").
- TUYỆT ĐỐI KHÔNG nhận xét thái độ/nét chữ (Không: "Nét chữ cẩn thận", "Thái độ nghiêm túc").
- TẬP TRUNG vào lỗi sai ngữ pháp/từ vựng thực tế và cách sửa lỗi.

YÊU CẦU KỸ THUẬT:
1. Rà soát từng chữ. Bỏ qua lỗi viết hoa/dấu câu.
2. Thống kê tổng số câu (totalSentences) và số câu đúng hoàn toàn (correctSentences).
3. Điểm (score) = (correctSentences / totalSentences) * 10.
4. Ngôn ngữ: Tiếng Việt.

Định dạng JSON yêu cầu:
{
  "isReadable": boolean,
  "unreadableReason": string,
  "recognizedText": string,
  "score": number,
  "errorCount": number,
  "correctSentences": number,
  "totalSentences": number,
  "errors": Array<{ "wrong": string, "correct": string, "type": string, "explanation": string }>,
  "sentenceAnalysis": Array<{ "original": string, "corrected": string, "isCorrect": boolean, "feedback": string }>,
  "assessment": { "strength": string, "weakness": string, "improvement": string, "parentReport": string }
}

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
          correctSentences: { type: Type.INTEGER },
          totalSentences: { type: Type.INTEGER },
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
              parentReport: { type: Type.STRING },
            },
            required: ["strength", "weakness", "improvement", "parentReport"],
          },
        },
        required: ["isReadable", "recognizedText", "score", "errors", "sentenceAnalysis", "assessment", "correctSentences", "totalSentences"],
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
