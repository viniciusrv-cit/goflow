import { useRef, useState } from 'react';

async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'txt' || ext === 'md') {
    return await file.text();
  }

  if (ext === 'pdf') {
    const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    if (!text.trim()) throw new Error('PDF não contém texto extraível (pode ser uma imagem escaneada).');
    return text;
  }

  if (ext === 'docx') {
    const mammoth = await import('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.esm.js');
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    if (!result.value.trim()) throw new Error('Não foi possível extrair texto do arquivo DOCX.');
    return result.value;
  }

  throw new Error(`Formato não suportado: .${ext}. Use txt, md, pdf ou docx.`);
}

export default function FileImport({ onExtracted }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const text = await extractText(file);
      onExtracted(text, file.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.pdf,.docx"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button
        type="button"
        className="chat-attach-btn"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        title="Importar arquivo (txt, md, pdf, docx)"
      >
        {loading ? '…' : '📎'}
      </button>
      {error && <div className="attach-error">{error}</div>}
    </>
  );
}
