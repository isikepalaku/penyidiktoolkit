export const audioPrompts = {
  transcribe: {
    id: 'transcribe',
    prompt: `Transkripsikan audio ini ke dalam teks dengan memperhatikan:
- Kualitas transkripsi yang akurat
- Pembagian paragraf yang jelas
- Tanda baca yang tepat
- Pembicara yang berbeda diberi label dengan format:
  [Pembicara 1]: teks
  [Pembicara 2]: teks

Output dalam format Markdown:

# Hasil Transkripsi

[transcript anda di sini, gunakan paragraf yang terstruktur dengan baik]

## Metadata
- Durasi: [perkiraan durasi]
- Jumlah Pembicara: [jumlah]
- Kualitas Audio: [baik/sedang/buruk]`,
    description: 'Transkripsi audio ke teks dengan akurasi tinggi'
  },
  sentiment: {
    id: 'sentiment',
    prompt: `Analisis sentimen dari audio ini dengan format:

# Analisis Sentimen Audio

## Sentimen Dominan
[positif/negatif/netral] (confidence: X%)

## Emosi Terdeteksi
${Array(3).fill('- [emosi] (confidence: X%)').join('\n')}

## Kata Kunci dan Frasa
${Array(3).fill('- "[frasa]" (konteks/nada)').join('\n')}

## Analisis Kontekstual
[Berikan analisis singkat tentang konteks percakapan, maksud pembicara, dan dinamika interaksi]

## Rekomendasi
[Berikan saran konkret berdasarkan analisis di atas]

Catatan:
- Gunakan data kuantitatif untuk confidence scores
- Sertakan kutipan spesifik dari audio
- Jelaskan konteks dengan detail
- Berikan rekomendasi yang actionable`,
    description: 'Analisis sentimen dan emosi dari audio'
  }
} as const;

export type AudioPromptType = keyof typeof audioPrompts;

export const getAudioPrompt = (type: AudioPromptType): string => {
  return audioPrompts[type].prompt;
};