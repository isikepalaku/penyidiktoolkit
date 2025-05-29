import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { LaporanInformasiData, GeminiReportResponse } from '@/types/spktTypes'; // Menggunakan path relatif dari root proyek

const MODEL_NAME = "gemini-2.5-flash-preview-04-17";

const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY environment variable not found.");
    throw new Error("VITE_GEMINI_API_KEY environment variable not found. Please ensure it is set.");
  }
  return apiKey;
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

// Helper function to convert number to Roman numeral (for months 1-12)
function toRoman(num: number): string {
  if (num < 1 || num > 12) return num.toString(); // Basic fallback
  const romanNumerals: { [key: number]: string } = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
    7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'
  };
  return romanNumerals[num];
}

// Helper function to get Indonesian month name
function getIndonesianMonthName(monthIndex: number): string {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  return months[monthIndex];
}


function buildPrompt(chronologyText: string): string {
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonthIndex = now.getMonth(); // 0-indexed
  const currentRomanMonth = toRoman(currentMonthIndex + 1);
  const currentDay = now.getDate().toString().padStart(2, '0');
  const currentIndonesianMonthName = getIndonesianMonthName(currentMonthIndex);
  const currentDateIndonesian = `${currentDay} ${currentIndonesianMonthName} ${currentYear}`;

  return `
    Anda adalah asisten AI yang sangat ahli dalam menganalisis kronologi kejadian dan mengubahnya menjadi Laporan Informasi Kepolisian sesuai format standar Indonesia.
    
    Tugas Anda adalah membaca kronologi berikut dengan seksama:
    ---
    ${chronologyText}
    ---
    
    INSTRUKSI PENTING UNTUK JSON:
    1. Output harus berupa JSON yang valid dan dapat di-parse
    2. Semua array harus menggunakan format: ["item1", "item2", "item3"] dengan koma yang benar
    3. Pastikan tidak ada trailing comma di akhir array atau object
    4. Gunakan double quotes (") untuk semua string, jangan single quotes (')
    5. Pastikan semua bracket dan brace tertutup dengan benar
    
    INFORMASI WAKTU SAAT INI:
    - Bulan Romawi Saat Ini: ${currentRomanMonth}
    - Tahun Saat Ini: ${currentYear}
    - Tanggal Lengkap Saat Ini (format Indonesia): ${currentDateIndonesian}

    INSTRUKSI PENGISIAN FIELD:
    1. Untuk "nomorLaporan": Gunakan format LI/[NOMOR URUT]/${currentRomanMonth}/RES.[KODE]/${currentYear}/[UNIT]
    2. Untuk "kotaTanggalLapor": Gunakan ${currentDateIndonesian}
    3. Untuk semua field tanggal: Format "dd mmmm yyyy" dalam Bahasa Indonesia

    Format JSON yang WAJIB Anda hasilkan (pastikan format array yang benar):
    {
      "nomorLaporan": "LI/001/${currentRomanMonth}/RES.SPKT/${currentYear}/POLSEK",
      "tentang": "Dugaan Tindak Pidana [deskripsi singkat]",
      "pendahuluan": {
        "sumber": "[Sumber informasi]",
        "caraMendapatkan": "[Cara mendapatkan informasi]",
        "waktuMendapatkan": "[Waktu format: dd mmmm yyyy pukul HH.MM WIB]",
        "tempatBaketDidapat": "[Tempat informasi didapat]",
        "objekDugaanPerkara": "[Objek dugaan perkara]"
      },
      "faktaFakta": {
        "subyek1": {
          "nama": "[Nama lengkap]",
          "nomorIdentitas": "[Nomor identitas]",
          "kewarganegaraan": "WNI",
          "jenisKelamin": "[Laki-laki/Perempuan]",
          "tempatTanggalLahir": "[Tempat], [dd mmmm yyyy]",
          "pekerjaan": "[Pekerjaan]",
          "agama": "[Agama]",
          "alamat": "[Alamat lengkap]"
        },
        "subyek2": null
      },
      "uraianPerkara": [
        "Poin pertama uraian perkara berdasarkan kronologi",
        "Poin kedua uraian perkara",
        "Poin ketiga uraian perkara jika ada"
      ],
      "kesimpulan": [
        "Kesimpulan pertama dari analisis",
        "Kesimpulan kedua jika ada"
      ],
      "saran": [
        "Saran pertama untuk tindak lanjut",
        "Saran kedua jika ada"
      ],
      "penutupDetails": {
        "dugaanTindakPidana": "[Jenis dugaan tindak pidana]",
        "pasalUuYangRelevan": "[Pasal dan UU yang relevan]",
        "tempatKejadianPerkara": "[Lokasi TKP detail]",
        "waktuKejadianLengkap": "[Waktu kejadian lengkap]",
        "kurunWaktuSpesifik": "[Kurun waktu spesifik]"
      },
      "kotaTanggalLapor": "${currentDateIndonesian}",
      "pelapor": {
        "nama": "[Nama pelapor]",
        "pangkatNrp": "[Pangkat NRP]"
      }
    }

    PENTING: 
    - Output hanya berupa JSON yang valid, tanpa text tambahan
    - Pastikan semua array menggunakan format dengan koma yang benar
    - Jika tidak ada informasi untuk subyek2, gunakan null
    - Semua string harus menggunakan double quotes
    - Jangan ada trailing comma di akhir array atau object
  `;
}

export const generateReportFromChronology = async (chronologyText: string): Promise<LaporanInformasiData> => {
  if (!chronologyText.trim()) {
    throw new Error("Chronology text cannot be empty.");
  }

  const prompt = buildPrompt(chronologyText);
  const contentForAPI: Content[] = [{ role: "user", parts: [{ text: prompt }] }];

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contentForAPI, 
      config: {
        responseMimeType: "application/json",
        temperature: 0.1, // Lower temperature for more consistent JSON output
      },
    });
    
    const responseText = response.text;
    if (typeof responseText !== 'string' || !responseText.trim()) {
        throw new Error("API response is empty or not a string.");
    }
    
    let jsonStr = responseText.trim();
    
    // Remove markdown code fences if present
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    // Clean up common JSON formatting issues that cause parsing errors
    jsonStr = jsonStr
      // Remove trailing commas in arrays and objects
      .replace(/,(\s*[\]}])/g, '$1')
      // Fix missing commas between array elements
      .replace(/"\s*\n\s*"/g, '",\n    "')
      // Fix missing commas between object properties
      .replace(/}\s*\n\s*"/g, '},\n    "')
      // Ensure proper comma placement in arrays
      .replace(/\]\s*\n\s*\[/g, '],\n    [')
      // Remove any extra characters that might break JSON
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      // Fix quotes that might be malformed
      .replace(/'/g, '"'); // Replace single quotes with double quotes if any

    console.log('Attempting to parse JSON response...', jsonStr.substring(0, 200));

    let parsedData: GeminiReportResponse;
    try {
      parsedData = JSON.parse(jsonStr) as GeminiReportResponse;
    } catch (parseError) {
      console.error('JSON Parse Error Details:', parseError);
      console.error('Problematic JSON (first 500 chars):', jsonStr.substring(0, 500));
      console.error('Problematic JSON (last 500 chars):', jsonStr.substring(Math.max(0, jsonStr.length - 500)));
      
      // Try to extract just the JSON portion if there's extra text
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]) as GeminiReportResponse;
          console.log('Successfully parsed JSON after cleanup');
        } catch (secondError) {
          throw new Error(`Failed to parse JSON response after cleanup. Original error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      } else {
        throw new Error(`Invalid JSON format. Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    }
    
    // Validate required fields
    if (!parsedData.tentang || !parsedData.pendahuluan || !parsedData.faktaFakta) {
        throw new Error("Generated data is missing critical fields.");
    }
    
    // Clean up subyek2 if it's empty
    if (parsedData.faktaFakta.subyek2 && !parsedData.faktaFakta.subyek2.nama) {
        parsedData.faktaFakta.subyek2 = null;
    }

    // Ensure arrays are properly formatted
    if (!Array.isArray(parsedData.uraianPerkara)) {
      parsedData.uraianPerkara = [];
    }
    if (!Array.isArray(parsedData.kesimpulan)) {
      parsedData.kesimpulan = [];
    }
    if (!Array.isArray(parsedData.saran)) {
      parsedData.saran = [];
    }

    console.log('Successfully parsed and validated JSON data');
    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    if (error instanceof Error) {
        if (error.message.includes("Candidate was blocked due to SAFETY")) {
            throw new Error("Konten tidak dapat diproses karena melanggar kebijakan keselamatan Google. Harap periksa kembali input Anda.");
        }
        if (error.message.includes("API key not valid")) {
            throw new Error("API Key Gemini tidak valid. Pastikan VITE_GEMINI_API_KEY sudah benar.");
        }
        throw new Error(`Failed to generate report: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the report.");
  }
}; 