# Safety Case / SMS Uygulaması — Kullanım Sunumu ve İşletme Kılavuzu

**Hedef kitle:** Olay bildiren personel, güvenlik görevlileri, yöneticiler, kalite/SMS ekibi  
**Odak:** Sistemin *nasıl kullanılacağı* (ekranlar, roller, önerilen akış). Teknik kurulum içermez.  
**Belge tarihi:** Mart 2026 (uygulama sürümüne göre küçük farklar olabilir)

---

## 1. Bu sistem neyi çözer?

Kurum içi **güvenlik olayları, tehlikeler, yakın kaçırma, prosedür sapmaları ve değişiklik (MoC)** kayıtlarını tek yerde toplar; her kayıt için **risk değerlendirmesi (HIRM)**, **mitigasyon (düzeltici/önleyici aksiyon)**, **etkinlik kontrolü** ve **onay** adımlarını izlenebilir hale getirir.

Kullanıcı açısından ana fikir şudur: **Bir “vaka” (Safety Case)** açılır; vakanın üst bilgisinde **yaşam döngüsü rozeti** (ör. Taslak, Açık, Mitigasyon açık, İzleme, Kapalı) vakanın *nerede olduğunu* özetler. Detaylı iş adımları ise **sekmeler** üzerinden yürür.

---

## 2. Temel kavramlar

| Kavram | Kullanıcıya anlatım |
|--------|---------------------|
| **Rapor / Safety Case** | Tek bir güvenlik konusunun dosyasıdır (olay, değişiklik veya risk çalışması). Liste ve detay ekranlarında vaka numarası ve başlık görünür. |
| **Yaşam döngüsü (lifecycle)** | Vakanın *mantıksal aşamasıdır*: taslak mı, risk/aksiyon devam ediyor mu, izlemede mi, kapandı mı? Üst bantta yeşil etiket olarak gösterilir. |
| **İş akışı durumu (status)** | Kurumsal süreçte kullanılan daha ayrıntılı durum etiketidir (ör. “HIRM Gerekli”, “Aksiyon Uygulanıyor”). Bazı raporlarda hem lifecycle hem status birlikte görülebilir; ikisi birbirini tamamlar. |
| **HIRM** | Tehlike + şiddet/olasılık ile risk seviyesinin (ör. tolere edilemez / tolere edilebilir / kabul edilebilir) belirlendiği bölümdür. |
| **Mitigasyon** | Riski azaltmak için tanımlanan aksiyonlardır; sorumlu ve hedef tarih içerir. |
| **MoC (Management of Change)** | Tesis, süreç veya organizasyonel değişikliklerin ayrı bir “değişiklik kaydı” ile izlendiği sekmedir. |

---

## 3. Giriş, dil ve güvenlik

- **Giriş:** Kurum e-postası ve şifre ile oturum açılır; oturum tarayıcıda güvenli şekilde saklanır (kurumsal politika gereği paylaşılan bilgisayarlarda çıkış yapılmalıdır).
- **Çıkış:** Sağ üstte çıkış düğmesi.
- **Dil:** Üst menüde **TR / EN** seçilebilir; bazı sabit etiketler (ör. “Action Board”) İngilizce kalabilir.

---

## 4. Üst menü — herkesin gördüğü ana kapılar

| Menü | Kim kullanır | Ne işe yarar |
|------|----------------|--------------|
| **Pano (Dashboard)** | Herkes; özellikle SMS/yönetim | Açık vakalar, aksiyonlar, MOR uyarıları, onay bekleyenler gibi özet göstergeler. İleri düzey: lesson learned ve uygun rollere uyumluluk bulguları. |
| **Raporlar** | Herkes | Tüm vakaların listesi; filtreleme ve vakaya girme. |
| **Action Board** | Aksiyon sahipleri, hat yöneticileri, SMS | **Tüm mitigasyonların** tek tabloda takibi: gecikenler, bana atanmışlar filtreleri; satırdan ilgili vakanın mitigasyon sekmesine gidilir. |
| **Registers** | SMS, kalite, denetim | Case / change özetleri; risk ve mitigasyon *kayıt sayısı* özetleri (ayrıntı için vaka ekranı veya Action Board). |
| **Yeni rapor** | Bildiren, hat, SMS | Yeni vaka açma formu. |

---

## 5. Yeni vaka oluşturma

**Yeni rapor** formunda en azından **başlık** ve mümkünse **açıklama**, **birim (departman)**, **kategori**, **vaka tipi** doldurulmalıdır. Uçak kayıt, tip, parça numarası, anında alınan önlemler gibi alanlar olaya göre isteğe bağlıdır.

Kayıt oluşturulunca kullanıcı otomatik olarak **o vakanın detay sayfasına** yönlendirilir.

---

## 6. Vaka detayı — sekmeler (iş sürecine göre sıra)

Vaka başlığının altında sekmeler vardır. Aşağıdaki sıra, tipik bir **olay tabanlı** süreç için anlatım sırasıdır; değişiklik (MoC) vakalarında öncelik **MoC** ve **Risk (HIRM)** sekmeleri olabilir.

### 6.1 Genel / Ekler

- Vakanın tanımı, meta bilgiler ve **ek dosyalar**.
- Durum güncellemeleri ve genel bakış genelde bu çevrede kullanılır.

### 6.2 Triage / İnceleme

- SMS veya yetkili personelin vakayı **SMS kapsamında mı**, **MOR** gerekiyor mu gibi kararları işlediği alandır.
- **İlk inceleme (case review)** kontrol listesi ve notlar burada veya bu süreçle ilişkili ekranlarda tutulur (kurum prosedürünüze göre eğitimde vurgulanmalıdır).
- Uygun statü seçimi ve yorumlar **iz süreci** için önemlidir.

### 6.3 Soruşturma

- Kök neden, kanıt ve soruşturma notları için ayrılmış sekmedir. Derinlemesine analiz burada dokümante edilir.

### 6.4 Risk (HIRM)

- Tehlike ifadeleri ve **risk satırları** (şiddet / olasılık matrisi ile risk seviyesi).
- Her risk satırı için **sahip**, **inceleme tarihi** gibi alanlar takip edilir.
- Risk seviyesi yüksek olduğunda kurumun **risk kabulü / onay hiyerarşisi** devreye girer (bkz. Onaylar).

### 6.5 Mitigasyon

- Risklere bağlı **aksiyonlar**: açıklama, tür (ör. düzeltici / önleyici), sorumlu, **hedef tarih**.
- Bu sekmedeki kayıtlar **Action Board**’da da listelenir; günlük operasyon takibi için Action Board tercih edilebilir.

### 6.6 Etkinlik

- Aksiyonların uygulanmasının ardından **etkinlik incelemesi**: önlemler işe yaradı mı, ek aksiyon gerekli mi?
- “Ek aksiyon gerekli” işaretlenirse yaşam döngüsü tekrar aksiyon/iş odaklı aşamaya dönebilir (sistem bunu veriye göre günceller).

### 6.7 Onaylar

- Tanımlı **onay rotaları** üzerinden imza/onay adımları.
- Risk seviyesine göre **kimin onaylayacağı** master veride tanımlıdır; eğitimde kurum rol isimleriyle eşleştirin (ör. SMS Manager, Accountable Manager).

### 6.8 Yorum / İz

- Vaka üzerinde tartışma, yönlendirme ve **denetim izi** için yorum akışı.

### 6.9 MoC

- **Değişiklik** kapsamındaki vakalar için: değişiklik tipi, kapsam, açıklama.
- Atölye kurulumu gibi büyük değişikliklerde risk kalemleri HIRM’de çoğaltılabilir; **Registers → Change register** ile değişiklik vakaları listelenir.

---

## 7. Önerilen uçtan uca iş akışı (sunumda anlatılacak hikâye)

1. **Bildirim:** Hat veya ilgili birim **Yeni rapor** ile vaka açar; anında alınan önlemleri yazar.  
2. **Triage:** SMS vakayı sınıflandırır; gerekirse soruşturma veya HIRM’e yönlendirir.  
3. **Risk:** HIRM’de her tehlike için kontroller ve risk seviyesi netleştirilir.  
4. **Mitigasyon:** Her önemli risk için aksiyon tanımlanır; sahiplere atanır ve **Action Board** ile takip edilir.  
5. **Etkinlik:** Aksiyonlar tamamlanınca etkinlik kontrolü yapılır.  
6. **Onay:** Gerekli risk kabulü / onay adımları tamamlanır.  
7. **Kapanış:** Vaka kapatılır; lesson learned ve registers üzerinden kurumsal öğrenme ve raporlama desteklenir.

Sunumda tek slayt için özet: **“Kayıt → Triage → Risk → Aksiyon → Etkinlik → Onay → Kapanış”.**

---

## 8. Roller (örnek — kurumda isimler eşleştirilmeli)

Uygulama içinde kullanıcı profilinde **rol** görünür. Örnek roller:

- **Reporter:** Olay bildirir, temel alanları doldurur.  
- **SafetyOfficer / SMS:** Triage, HIRM yönlendirmesi, süreç yönetimi.  
- **Manager / Admin:** Geniş yetki; özet panolar ve yönetim işlemleri.

> **Eğitim ortamı notu:** Geliştirme veritabanında örnek hesaplar bulunabilir; **canlı ortamda şifreler ve roller IT/SMS tarafından atanır.** Demo şifreleri eğitim dokümanında paylaşılmamalıdır.

---

## 9. Bildirimler (e-posta)

Sistem, örneğin **yeni vaka** veya **yeni mitigasyon** oluştuğunda kurallara göre **e-posta bildirimi kuyruğa** alabilir. Postaların gerçekten iletilmesi kurumda **e-posta altyapısı ve arka planda çalışan bildirim işçisi** ile yapılandırılır. Kullanıcı tarafında beklenti: “Atandığım aksiyon için e-posta alabilirim” — bunun açık/kapalı olması kuruluma bağlıdır.

---

## 10. PDF olarak bu belgeyi alma

1. Aynı klasördeki **`SUNUM_KULLANIM_KILAVUZU.html`** dosyasını Chrome veya Edge ile açın.  
2. **Yazdır** (Ctrl+P) → **Hedef:** “PDF olarak kaydet” / “Microsoft Print to PDF”.  
3. Kenar boşlukları: **Varsayılan** veya **Minimum**; arka plan grafikleri isteğe bağlı açılabilir.

Markdown sürümü (`SUNUM_KULLANIM_KILAVUZU.md`) düzenleme ve sürüm kontrolü içindir.

---

## 11. Sunum ipuçları (sunucu / eğitmen için)

- İlk 3 dakikada **menü turu** yapın: Dashboard → Raporlar → bir demo vaka → Action Board.  
- **Workshop / değişiklik** demosu için seed’de örnek CHANGE vakası anlatılabilir (kurum numarası farklı olabilir).  
- “Lifecycle rozeti ile status farkı” sorulursa: biri *özet aşama*, diğeri *iş akışı etiketi*; ikisi birlikte raporlamayı destekler.  
- IT soruları (sunucu, güvenlik) bu belgenin kapsamı dışındadır; ayrı “teknik rollout” slaytı kullanın.

---

*Bu metin ürün arayüzüne göre güncellenmelidir; menü ve sekme isimleri ekran görüntüsü ile doğrulanması önerilir.*
