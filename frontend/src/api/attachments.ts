import { api } from './client';

export interface Attachment {
  id: number;
  reportId: number;
  fileName: string;
  filePath: string;
  uploadedAt: string;
  uploader?: { id: number; name: string };
}

export const attachmentsApi = {
  list: (reportId: number) => api.get<Attachment[]>(`/reports/${reportId}/attachments`),
  upload: (reportId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<Attachment>(`/reports/${reportId}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  download: async (reportId: number, attachmentId: number, fileName: string) => {
    const { data } = await api.get(`/reports/${reportId}/attachments/${attachmentId}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },
};
