import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  tr: {
    translation: {
      app: { title: 'SMS Risk Analizi' },
      nav: { dashboard: 'Dashboard', reports: 'Raporlar', newReport: 'Yeni Rapor', logout: 'Çıkış' },
      login: { title: 'Giriş Yap', email: 'E-posta', password: 'Şifre', submit: 'Giriş Yap', loading: 'Giriş yapılıyor...' },
      reports: {
        title: 'Raporlar',
        newReport: 'Yeni Rapor',
        no: 'No',
        titleCol: 'Başlık',
        date: 'Tarih',
        department: 'Departman',
        risk: 'Risk',
        status: 'Durum',
        detail: 'Detay',
        excelExport: 'Excel İndir',
        exporting: 'İndiriliyor...',
        noReports: 'Henüz rapor yok.',
      },
      report: {
        back: 'Listeye Dön',
        review: 'Rapor İnceleme / Durum Değiştir',
        hirm: 'HIRM / Risk Analizi',
        actions: 'Aksiyon Planı',
        attachments: 'Dosyalar',
      },
      status: {
        NEW: 'Yeni',
        UNDER_REVIEW: 'İncelemede',
        NOT_SAFETY_RELATED: 'SMS Kapsamı Dışı',
        HIRM_REQUIRED: 'HIRM Gerekli',
        IN_HIRM: 'HIRM Yapılıyor',
        ACTION_PLANNING: 'Aksiyon Planlanıyor',
        ACTION_IN_PROGRESS: 'Aksiyon Uygulanıyor',
        PENDING_EFFECTIVENESS_CHECK: 'Etkililik Kontrolü Bekleniyor',
        CLOSED: 'Kapatıldı',
      },
      mor: { warning: 'MOR süresi yaklaşıyor', deadline: 'Son tarih' },
      loading: 'Yükleniyor...',
    },
  },
  en: {
    translation: {
      app: { title: 'SMS Risk Analysis' },
      nav: { dashboard: 'Dashboard', reports: 'Reports', newReport: 'New Report', logout: 'Logout' },
      login: { title: 'Sign In', email: 'Email', password: 'Password', submit: 'Sign In', loading: 'Signing in...' },
      reports: {
        title: 'Reports',
        newReport: 'New Report',
        no: 'No',
        titleCol: 'Title',
        date: 'Date',
        department: 'Department',
        risk: 'Risk',
        status: 'Status',
        detail: 'Detail',
        excelExport: 'Export Excel',
        exporting: 'Exporting...',
        noReports: 'No reports yet.',
      },
      report: {
        back: 'Back to List',
        review: 'Report Review / Change Status',
        hirm: 'HIRM / Risk Analysis',
        actions: 'Action Plan',
        attachments: 'Attachments',
      },
      status: {
        NEW: 'New',
        UNDER_REVIEW: 'Under Review',
        NOT_SAFETY_RELATED: 'Not Safety Related',
        HIRM_REQUIRED: 'HIRM Required',
        IN_HIRM: 'In HIRM',
        ACTION_PLANNING: 'Action Planning',
        ACTION_IN_PROGRESS: 'Action In Progress',
        PENDING_EFFECTIVENESS_CHECK: 'Pending Effectiveness Check',
        CLOSED: 'Closed',
      },
      mor: { warning: 'MOR deadline approaching', deadline: 'Deadline' },
      loading: 'Loading...',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'tr',
  fallbackLng: 'tr',
  interpolation: { escapeValue: false },
});

export default i18n;
