import axios from "axios";
import { apiV1Base } from "@/lib/apiUrl";

export const api = axios.create({
  baseURL: apiV1Base(),
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

  criar: async (dados: {
    contrato_id: number
    fornecedor_id: number
    numero: string
    serie?: string | null
    chave_acesso?: string | null
    data_emissao?: string | null
    valor_total?: number | null
    itens: Array<{
      codigo?: string
      descricao: string
      quantidade: number
      unidade: string
      valor_unitario: number
      item_contrato_id: number
      percentual_confianca?: number
      status_identificacao?: string
    }>
  }) => {
    const response = await api.post("/notas-fiscais/", dados)
    return response.data
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
  },

  downloadArquivo: async (nf: { id: number; numero?: string }) => {
    const response = await api.get(`/notas-fiscais/${nf.id}/arquivo`, {
      responseType: "blob",
    });
    const disposition = String(response.headers["content-disposition"] || "");
    const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
    const nomeHeader = match?.[1] ? decodeURIComponent(match[1].replace(/"/g, "")) : "";
    const nome = nomeHeader || `NF-${nf.numero || nf.id}.pdf`;
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    link.click();
    URL.revokeObjectURL(url);
  },

  atualizarVinculos: async (
    nfId: number,
    itens: { id: number; item_contrato_id: number }[],
  ) => {
    const response = await api.patch(`/notas-fiscais/${nfId}/vinculos`, { itens });
    return response.data;
  },
};

export const unidadesMedidaService = {
  listar: async () => {
    const response = await api.get("/unidades-medida/");
    return response.data;
  },
};

export const modalidadesLicitacaoService = {
  listar: async () => {
    const response = await api.get("/modalidades-licitacao/");
    return response.data;
  },
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
  },
  atualizar: async (id: number, dados: any) => {
    const response = await api.patch(`/contratos/${id}`, dados);
    return response.data;
  },
  aditivar: async (
    id: number,
    dados: {
      itens: { item_id: number; quantidade_aditivada: number; valor_unitario?: number }[];
    },
  ) => {
    const response = await api.post(`/contratos/${id}/aditivo`, dados);
    return response.data;
  },
};

export const fornecedoresService = {
  listar: async () => {
    const response = await api.get("/fornecedores/");
    return response.data;
  },
  criar: async (dados: any) => {
    const response = await api.post("/fornecedores/", dados);
    return response.data;
  },
  atualizar: async (id: number, dados: any) => {
    const response = await api.patch(`/fornecedores/${id}`, dados);
    return response.data;
  },
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
  },
  atualizar: async (id: number, dados: any) => {
    const response = await api.patch(`/almoxarifados/${id}`, dados);
    return response.data;
  },
};
