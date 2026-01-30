
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

YÊU CẦU NHẬN DIỆN CHỮ VIẾT TAY:
1. ĐỘ CHÍNH XÁC CAO: Đọc kỹ chữ viết tay (nghiêng, nối, mờ). Sử dụng ngữ cảnh để suy luận từ chính xác.
2. TRUNG THỰC: 'recognizedText' phải phản ánh đúng những gì học sinh đã viết (kể cả lỗi sai).

PHÂN BIỆT ĐỀ BÀI VÀ BÀI LÀM (QUAN TRỌNG NHẤT - CHỈ CHẤM LỖI HỌC SINH):
1. Phân biệt rõ văn bản in (Đề bài) và chữ viết tay (Bài làm của học sinh).
2. TUYỆT ĐỐI BỎ QUA lỗi ngữ pháp/chính tả trong phần ĐỀ BÀI (chữ in). Không liệt kê lỗi của đề bài vào danh sách lỗi.
3. CHỈ TẬP TRUNG chấm điểm và bắt lỗi phần BÀI LÀM (chữ viết tay) của học sinh.
4. Nếu đề bài sai nhưng học sinh làm đúng theo yêu cầu hoặc sửa lại cho đúng, tính là ĐÚNG.

YÊU CẦU QUAN TRỌNG VỀ CHẤM LỖI (IGNORE ERRORS):
1. TUYỆT ĐỐI KHÔNG bắt lỗi viết hoa (Capitalization) ở đầu câu hay tên riêng.
2. TUYỆT ĐỐI KHÔNG bắt lỗi chính tả tên người/tên riêng (Proper Names). Coi như học sinh viết đúng tên.
3. TUYỆT ĐỐI KHÔNG bắt lỗi dấu câu (Punctuation).
4. CHỈ tập trung vào lỗi Ngữ pháp (Grammar), Từ vựng (Vocabulary/Spelling - trừ tên riêng), và Cấu trúc câu quan trọng.
5. QUAN TRỌNG: Danh sách 'errors' phải được liệt kê theo đúng trình tự xuất hiện trong bài viết: Quét hết Trang 1 (từ dòng đầu đến dòng cuối), sau đó mới đến Trang 2. Không được nhảy cóc vị trí.

XÁC ĐỊNH BỐI CẢNH BÀI TẬP (CỰC KỲ QUAN TRỌNG):
Với mỗi lỗi tìm thấy, bạn phải xác định xem lỗi đó nằm trong bài tập nào:
- taskName: Tên bài tập (Ví dụ: "Exercise 1", "Bài II", "Section A", hoặc "Câu 5").
- taskInstruction: Yêu cầu của đề bài tại vị trí đó (Ví dụ: "Put the verbs in brackets into the correct form", "Rewrite the sentences", "Fill in the blanks").
Nếu không thấy tiêu đề rõ ràng, hãy suy luận dựa trên dạng bài.

YÊU CẦU VỀ GIỌNG VĂN NHẬN XÉT (parentReport):
- Dùng từ "Con" để gọi học sinh và xưng "Cô" trong văn phong.
- CẤM: Tuyệt đối KHÔNG dùng các từ "rất tốt", "xuất sắc". 
- CẤM: Tuyệt đối KHÔNG nhận xét về hình thức bài làm như "sạch đẹp", "trình bày tốt". Chỉ tập trung vào kiến thức.
- CẤM: Không yêu cầu phụ huynh kèm cặp hoặc nhắc nhở con ("Bố mẹ hãy giúp...", "Bố mẹ cần nhắc con...").
- CẤM: Tuyệt đối KHÔNG dùng cụm từ "thể hiện qua..." để liệt kê các phần con làm đúng (Ví dụ: "thể hiện qua việc con làm đúng 100%...").
- CẤM: Tuyệt đối KHÔNG dùng cụm từ "tránh mất điểm đáng tiếc" hoặc các cụm từ tương tự nói về việc mất điểm.
- QUY ĐỊNH DÙNG TỪ: CHỈ ĐƯỢC DÙNG các mức độ đánh giá: "tốt", "khá tốt", "tương đối tốt".
- ĐỊNH DẠNG VĂN BẢN: Xuất ra văn bản thuần (plain text). TUYỆT ĐỐI KHÔNG dùng các ký tự đánh dấu Markdown như ** (in đậm) hay * (dấu hoa thị). Sử dụng dấu gạch ngang (-) để gạch đầu dòng.

CẤU TRÚC MẪU NHẬN XÉT BẮT BUỘC:
1. Mở đầu: "Cô nhận xét bài tập [Chủ đề cụ thể của bài tập - ví dụ: về động từ 'to be', miêu tả gia đình...] của con."
2. Đánh giá chung: "Con nắm nội dung bài học [mức độ: tốt/khá tốt/...], đặc biệt là [điểm mạnh kiến thức cụ thể]. Tuy nhiên, bài làm còn mắc [ghi rõ tổng số lượng lỗi] lỗi cần khắc phục:"
3. Chi tiết lỗi (dùng gạch đầu dòng -): Liệt kê các lỗi sai quan trọng nhất theo thứ tự từ trên xuống dưới. Mỗi dòng phải có: [Quy tắc ngữ pháp giải thích kỹ bằng tiếng Việt] + [Ví dụ đối chiếu sai/đúng lấy từ bài làm của con].
   
   Gợi ý cách viết lỗi (Ví dụ):
   - Với chủ ngữ là 'You', động từ luôn bắt buộc là 'are' (ví dụ: 'You are late', con không viết 'You is').
   - Khi chủ ngữ gồm hai người trở lên nối bằng 'and' (ví dụ: 'John and I'), câu mang nghĩa là 'chúng tôi' (số nhiều), nên phải dùng 'are', con không dùng 'am' dù từ này đứng ngay cạnh chữ 'I'.
   - Con cần quan sát kỹ danh từ số ít và số nhiều. Danh từ không có 's' (số ít) dùng 'is', danh từ có 's/es' (số nhiều) dùng 'are'. Ví dụ: 'The book is', 'The boxes are'.

YÊU CẦU KỸ THUẬT VỀ ĐẾM CÂU VÀ TÍNH ĐIỂM (CỰC KỲ QUAN TRỌNG):
1. QUY TẮC ĐẾM "TOTAL SENTENCES" (Tổng số câu):
   - KHÔNG phụ thuộc vào dấu chấm câu: Học sinh thường quên chấm câu. Hãy dựa vào ngữ nghĩa (Subject + Verb) hoặc cấu trúc từng dòng bài tập để tách câu.
   - Bài tập dạng danh sách/xuống dòng: Mỗi dòng bài tập sắp xếp câu, mỗi câu hỏi trắc nghiệm, mỗi câu điền từ ĐỀU PHẢI TÍNH LÀ 1 CÂU RIÊNG BIỆT.
   - Ví dụ: Bài tập có 10 câu nhỏ đánh số từ 1 đến 10 => totalSentences ít nhất là 10.
   - Hãy đếm dư còn hơn đếm thiếu. Đừng gộp nhiều câu ngắn thành 1 câu dài.

2. CÔNG THỨC TÍNH ĐIỂM:
   - totalSentences = Tổng số câu đếm được theo quy tắc trên.
   - correctSentences = Số câu KHÔNG mắc lỗi ngữ pháp/từ vựng (đã bỏ qua lỗi viết hoa/dấu câu).
   - Score = (correctSentences / totalSentences) * 10.

- Ngôn ngữ: Tiếng Việt.
- Rà soát từng chữ trên toàn bộ các trang.

Định dạng JSON yêu cầu:
{
  "isReadable": boolean,
  "unreadableReason": string,
  "recognizedText": string,
  "score": number,
  "errorCount": number,
  "correctSentences": number,
  "totalSentences": number,
  "errors": Array<{ "wrong": string, "correct": string, "type": string, "explanation": string, "page": number, "context": string, "taskName": string, "taskInstruction": string }>,
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
                context: { type: Type.STRING, description: "Trích dẫn nguyên văn cả câu chứa lỗi của học sinh." },
                taskName: { type: Type.STRING, description: "Tên bài tập, ví dụ: 'Exercise 1', 'Bài 2'." },
                taskInstruction: { type: Type.STRING, description: "Yêu cầu của đề bài, ví dụ: 'Chia động từ', 'Điền từ'." },
              },
              required: ["wrong", "correct", "type", "explanation", "page", "context"],
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
