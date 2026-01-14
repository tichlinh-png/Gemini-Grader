
import { GoogleGenAI, Type } from "@google/genai";
import { GradingResult } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ImagePart {
  base64: string;
  mime: string;
}

export const gradeWriting = async (images: ImagePart[]): Promise<GradingResult> => {
  // Gửi ảnh kèm nhãn văn bản để AI phân biệt rõ thứ tự các trang
  const contentsParts: any[] = [];
  images.forEach((img, index) => {
    contentsParts.push({ text: `Nội dung trang ${index + 1}:` });
    contentsParts.push({
      inlineData: {
        data: img.base64,
        mimeType: img.mime,
      }
    });
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        parts: [
          ...contentsParts,
          {
            text: `Bạn là một chuyên gia ngôn ngữ học và giáo viên tiếng Anh Senior với khả năng đọc chữ viết tay (OCR) cực kỳ xuất sắc. Nhiệm vụ của bạn là rà soát bài làm từ ${images.length} trang ảnh.

YÊU CẦU NHẬN DIỆN CHỮ VIẾT TAY (QUAN TRỌNG):
1. ĐỘ CHÍNH XÁC CAO: Phải đọc cực kỳ cẩn thận các kiểu chữ viết tay khác nhau: chữ nghiêng, chữ nối (cursive), chữ trẻ em chưa tròn trịa, hoặc chữ bị mờ. 
2. DỰA VÀO NGỮ CẢNH: Khi gặp một từ khó đọc hoặc ký tự mơ hồ (ví dụ: '5' và 'S', 'u' và 'v', 'n' và 'r'), hãy sử dụng ngữ cảnh của toàn câu và kiến thức ngữ pháp tiếng Anh để suy luận chính xác từ mà học sinh muốn viết.
3. TRUNG THỰC: 'recognizedText' phải phản ánh chính xác nhất những gì học sinh đã viết trên giấy, bao gồm cả các lỗi chính tả ban đầu.

ƯU TIÊN PHÂN TÍCH CHUYÊN SÂU:
1. CẤU TRÚC PHỨC TẠP: Tập trung kiểm tra tính chính xác của các thì (tenses), câu điều kiện, câu bị động, mệnh đề quan hệ, và sự hòa hợp giữa chủ ngữ - động từ trong các câu phức.
2. LỖI XÂY DỰNG CÂU: Phát hiện các lỗi về cấu trúc câu như câu chạy (run-on sentences), câu thiếu thành phần (fragments), lỗi lặp từ vô nghĩa, hoặc cách diễn đạt vụng về, không tự nhiên.
3. BỎ QUA LỖI CƠ BẢN: Tuyệt đối KHÔNG tính lỗi nếu chỉ sai về viết hoa (capitalization) hoặc dấu câu (punctuation), trừ khi việc thiếu dấu câu làm thay đổi hoàn toàn ý nghĩa của câu.

YÊU CẦU VỀ XÁC ĐỊNH TRANG:
- Ghi nhận chính xác lỗi nằm ở trang nào (trang 1, trang 2...).
- Ưu tiên số trang theo ghi chú viết tay của giáo viên (ví dụ: "Eric 9" là trang 9). Nếu không thấy ghi chú, dùng số thứ tự ảnh.
- Mọi lỗi trong 'errors' và 'sentenceAnalysis' BẮT BUỘC phải có trường 'page'.

YÊU CẦU VỀ GIỌNG VĂN NHẬN XÉT (parentReport):
- Dùng từ "Con" để gọi học sinh.
- Cấu trúc: [Kiến thức con đã nắm được] -> [Lỗi sai/Hạn chế cụ thể con thường gặp] -> [Ví dụ thực tế lấy từ bài làm kèm sửa lỗi] -> [Giải thích quy tắc bằng tiếng Việt dễ hiểu].
- LƯU Ý: Phải dùng cụm từ "Con đã nắm được".
- CẤM: Chào hỏi, hứa hẹn, chúc tụng, nhận xét nét chữ/thái độ. Chỉ tập trung vào chuyên môn.

YÊU CẦU KỸ THUẬT:
- Rà soát từng chữ trên toàn bộ các trang.
- Score = (correctSentences / totalSentences) * 10.
- Ngôn ngữ phản hồi: Tiếng Việt.

Định dạng JSON yêu cầu:
{
  "isReadable": boolean,
  "unreadableReason": string,
  "recognizedText": string,
  "score": number,
  "errorCount": number,
  "correctSentences": number,
  "totalSentences": number,
  "errors": Array<{ "wrong": string, "correct": string, "type": string, "explanation": string, "page": number }>,
  "sentenceAnalysis": Array<{ "original": string, "corrected": string, "isCorrect": boolean, "feedback": string, "page": number }>,
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
                page: { type: Type.INTEGER },
              },
              required: ["original", "corrected", "isCorrect", "feedback", "page"],
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
                page: { type: Type.INTEGER },
              },
              required: ["wrong", "correct", "type", "explanation", "page"],
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
