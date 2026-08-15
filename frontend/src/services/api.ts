import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

export const notasFiscaisService = {
  importar: async (formData: FormData) => {
    // Para upload de arquivos, o Content-Type deve ser definido pelo navegador (multipart/form-data)
    // O axios remove automaticamente o json content-type padrão ao mandar FormData
    const response = await api.post("/notas-fiscais/importar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  
  baixar: async (nfId: number, baixaReq: { justificativa?: string; almoxarifado_id?: number }) => {
    const response = await api.post(`/notas-fiscais/${nfId}/baixar`, baixaReq);
    return response.data;
  },

  parseXml: async (xmlFile: File) => {
    const formData = new FormData();
    formData.append("arquivo_xml", xmlFile);
    const response = await api.post("/notas-fiscais/parse-xml", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  parsePdf: async (pdfFile: File) => {
    const formData = new FormData();
    formData.append("arquivo_pdf", pdfFile);
    const response = await api.post("/notas-fiscais/parse-pdf", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  parseArquivo: async (file: File) => {
    const nome = file.name.toLowerCase();
    if (nome.endsWith(".xml")) {
      return notasFiscaisService.parseXml(file);
    }
    if (nome.endsWith(".pdf")) {
      return notasFiscaisService.parsePdf(file);
    }
    throw new Error("Envie um arquivo XML ou PDF da nota fiscal.");
  },

  vincularItens: async (contratoId: number, itens: any[]) => {
    const response = await api.post(`/notas-fiscais/vincular-itens/${contratoId}`, { itens });
    return response.data;
  },

  listar: async () => {
    const response = await api.get("/notas-fiscais/");
    return response.data;
  }
};

export const contratosService = {
  listar: async () => {
    const response = await api.get("/contratos/");
    return response.data;
  },
  previsaoConsumo: async () => {
    const response = await api.get("/contratos/previsao-consumo");
    return response.data;
  },
  criar: async (dados: any) => {
    const response = await api.post("/contratos/", dados);
    return response.data;
  }
};

export const fornecedoresService = {
  listar: async () => {
    const response = await api.get("/fornecedores/");
    return response.data;
  },
  criar: async (dados: any) => {
    const response = await api.post("/fornecedores/", dados);
    return response.data;
  }
};

export const licitacoesService = {
  listar: async () => {
    const response = await api.get("/licitacoes/");
    return response.data;
  }
};

export const movimentacoesService = {
  listar: async () => {
    const response = await api.get("/movimentacoes/");
    return response.data;
  }
};

export const almoxarifadosService = {
  listar: async () => {
    const response = await api.get("/almoxarifados/");
    return response.data;
  },
  detalhar: async (id: number) => {
    const response = await api.get(`/almoxarifados/${id}`);
    return response.data;
  },
  criar: async (dados: any) => {
    const response = await api.post("/almoxarifados/", dados);
    return response.data;
  }
};
