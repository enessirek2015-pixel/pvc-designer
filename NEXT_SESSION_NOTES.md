# PVC Designer - Next Session Notes

## Proje Ozeti

- Masaustu teknoloji: `Electron + React + TypeScript`
- Ana hedef: Logical benzeri profesyonel PVC pencere / kapi cizim ve uretim araci
- Durum: proje aktif olarak gelistiriliyor, build aliyor, cizim editoru artik CAD-benzeri seviyeye cikmaya basladi

## Kritik Kullanici Tercihleri

- Kullanici istemeden `.exe` olusturulmayacak
- Kullanici istemeden `GitHub` guncellenmeyecek
- Odak noktasi: cizim rahatligi, profesyonel his, Logical seviyesine yakin davranis

## Guncel Mimari

### Ana dosyalar

- `src/App.tsx`
  - ana UI
  - command bar
  - canvas
  - sag rail
  - object selection mantigi
- `src/store/useDesignerStore.ts`
  - Zustand store
  - undo/redo
  - panel/satir mutasyonlari
  - mirror / array / kutuphane modulleri
- `src/lib/designEngine.ts`
  - proje sagligi
  - panel engineering hesaplari
  - akilli tani / kontrol mantigi
- `src/lib/manufacturingEngine.ts`
  - BOM
  - kesim listesi
  - yazdirma HTML'i
- `src/lib/systemCatalog.ts`
  - seri / cam / donanim kataloglari
- `src/lib/profileLayout.ts`
  - kasa / kanat / cam gorunum katmanlari
- `src/data/moduleLibrary.ts`
  - hazir panel ve satir modulleri

## Tamamlanan Buyuk Ozellikler

### Nisan 2026 - Ticari Is Akisi Paketi 2

- `src/lib/customerRegistry.ts` buyutuldu
  - musteri hafizasi artik sadece isim/adres degil, gercek proje arsivi de tutuyor
  - her proje icin:
    - boyut
    - panel / acilir sayisi
    - sistem / seri / cam / donanim secimi
    - quote history
    - snapshot cizim verisi
    - son teklif para birimi
  - yeni helper:
    - `normalizeCustomerRegistry(...)`
  - quote kayitlari artik proje bazli tutuluyor
- `App.tsx` icinde CRM deneyimi buyutuldu
  - mevcut musteri icin `Proje Arsivi` karti geldi
  - son projeler:
    - boyut
    - sistem ozetleri
    - panel/acilir adedi
    - son teklif
    - `Arsivden Yukle`
  - musteri bazli teklif para birimi ozet ciplari eklendi
  - `Arsivden Yukle` artik snapshot kaydini aktif projeye geri getirebiliyor
  - `recentFiles` tekrarli kodu `rememberRecentFile(...)` ile sadeleştirildi
- `App.tsx` icinde fiyatlandirma tarafi buyutuldu
  - yeni `Teklif Arsivi / Musteri Portfoyu` karti eklendi
  - mevcut musteri icin:
    - arsiv proje adedi
    - teklif adedi
    - son teklif
    - son 6 teklif bar timeline'i
- `src/lib/dxfExport.ts` tamamen yenilendi
  - artik katmanli teknik DXF uretiyor:
    - `FRAME`
    - `MULLION`
    - `TRANSOM`
    - `GLASS`
    - `OPENING`
    - `DIMENSIONS`
    - `TEXT`
    - `TITLE`
    - `ANNOTATIONS`
  - eklenenler:
    - ic/dıs kasa konturu
    - dikey/yatay kayit rect'leri
    - cam rect'leri
    - acilim tipine gore teknik acilim isaretleri
    - ustte panel genislik zinciri
    - sagda satir yukseklik zinciri
    - genel genislik/yukseklik olculeri
    - proje/musteri/seri/cam iceren title block
- stil tarafinda yeni siniflar eklendi
  - CRM quote chip'leri
  - proje arsiv kartlari
  - pricing archive timeline
  - dark theme karsiliklari
- kontrol:
  - `npm.cmd run build` temiz gecti
  - guncel build:
    - `index.js` yaklasik `518 kB`
    - `technicalPrint` ayri chunk yaklasik `31 kB`
    - `revisionPacket` ayri chunk yaklasik `7 kB`
    - `FreeDrawCanvas` ayri chunk yaklasik `99 kB`
  - not:
    - Vite `500 kB` chunk warning'i geri geldi
    - sonraki teknik adimlardan biri tekrar code-split optimizasyonu olmali

### Nisan 2026 - Musteri Proje Merkezi ve Arsiv Revizyonu

- `App.tsx` icinde `buildFacadeComparisonRows(...)` buyutuldu
  - artik sadece geometri degil:
    - sistem
    - profil serisi
    - cam tipi
    - donanim
  - farklari da gosteriyor
- yeni state:
  - `selectedCustomerArchiveProjectId`
- yeni akışlar:
  - `handleStartArchiveRevision(...)`
    - arsiv snapshot'inden yeni revizyon taslagi aciyor
    - yeni `id`
    - yeni isim (`Revizyon`)
    - `revisionHistory` icine `manual / Arsiv Revizyonu` kaydi dusuyor
  - `handleLoadArchivedProject(...)`
    - mevcut projeye arsiv snapshot'ini yukleyebiliyor
- sol rail tarafina `Musteri Proje Merkezi` eklendi
  - en aktif 4 musteri
  - proje adedi
  - teklif adedi
  - son teklif bilgisi
  - `Musteriye Gec`
  - `Son Proje`
- malzeme/CRM karti buyutuldu
  - proje kartlarina:
    - `Karsilastir`
    - `Arsivden Yukle`
    - `Revizyon Ac`
  - secili arsiv projesi ile aktif proje arasinda `Aktif Proje vs Arsiv Kaydi` tablosu eklendi
- pricing tarafi buyutuldu
  - teklif timeline satirlari artik secilebilir
  - timeline'dan secilen proje arsiv karsilastirmasina kaynak oluyor
- `styles.css` tarafina yeni siniflar eklendi
  - `customer-center-*`
  - `customer-archive-compare`
  - pricing timeline aktif durumu
  - dark theme karsiliklari
- kontrol:
  - `npm.cmd run build` temiz gecti
  - guncel build:
    - `index.js` yaklasik `523 kB`
    - `technicalPrint` ayri chunk yaklasik `31 kB`
    - `revisionPacket` ayri chunk yaklasik `7 kB`
    - `FreeDrawCanvas` ayri chunk yaklasik `99 kB`
  - not:
    - bundle warning devam ediyor
    - sonraki teknik adimlardan biri `App.tsx` icindeki ticari panellerin code-split edilmesi olabilir

### Nisan 2026 - Kullanım Hatası Düzeltmeleri ve Çizim Rahatlığı Paketi

- masaustu dosya akisi duzeltildi
  - `electron/main.ts` icine `project:open-path` handler eklendi
  - `electron/preload.ts` icine `openProjectPath(...)` eklendi
  - `src/types/pvc.ts` icinde `DesktopApi` buna gore guncellendi
  - `App.tsx` icinde `handleOpenProjectPath(...)` eklendi
  - `Son Acilanlar` artik secilen dosyayi dogrudan aciyor
  - onceki hata:
    - son dosyalara tiklamak sadece generic open dialog aciyordu
- designer canvas zoom akisi iyilestirildi
  - artik wheel zoom imlec noktasina gore calisiyor
  - zoom plain wheel ile calisiyor, `Ctrl` gerekmiyor
  - background / surface uzerinde double click ile `Zoom to Fit` calisiyor
- designer canvas drag rahatligi buyutuldu
  - dikey kayit icin sadece kucuk handle degil, tum divider zone uzerinden drag baslayabiliyor
  - yatay kayit icin de ayni mantik eklendi
  - bu sayede panel genisligi ve satir yuksekligi cizimden daha rahat degistiriliyor
- gorunur etkileşim iyilestirmeleri
  - `canvas-wrap.premium.pan-mode` ile pan modunda `grab` hissi geldi
  - `divider-select-zone.vertical` / `horizontal` cursor ayrimi eklendi
  - divider zone hover dolgusu eklendi
- kontrol:
  - `npm.cmd run build` temiz gecti
  - guncel build:
    - `index.js` yaklasik `524 kB`
    - `technicalPrint` ayri chunk yaklasik `31 kB`
    - `revisionPacket` ayri chunk yaklasik `7 kB`
    - `FreeDrawCanvas` ayri chunk yaklasik `99 kB`
  - not:
    - bundle warning devam ediyor

### Nisan 2026 - Kaynak Senkronu, Set Yayilimi ve Revizyon Akisi

- `App.tsx` icine kaynak-plan senkron motoru baglandi
  - `linkedFacadeSync` artik UI tarafinda da kullaniliyor
  - `Kaynak Baglantisi` kartinda `Senkron / Plan Degisti / Kaynak Eksik` durumu gorunuyor
  - genislik, yukseklik ve panel farki `delta` bilgisi gosteriliyor
- aktif PVC cephesi artik kaynagindaki serbest cizim duvari ile tek tikta senkronlanabiliyor
  - geometri yeniden uretiliyor
  - mevcut malzeme secimleri korunuyor
  - mevcut `id`, ad ve bagli proje metadatasi korunuyor
  - aktif tasarima `revisionHistory` uzerinden `sync` kaydi ekleniyor
- bagli cephe setleri icin toplu malzeme yayilimi eklendi
  - `Tum Sete Hepsi`
  - `Tum Sete Seri`
  - `Tum Sete Cam`
  - `Tum Sete Sistem`
  - `Tum Sete Donanim`
  - `Tum Sete Renk`
  - bu aksiyonlar ayni `bundleId` altindaki tum `customTemplates` kayitlarini guncelliyor
  - her guncelleme `bulk-material` revizyonu olarak isleniyor
- `Kaynak Baglantisi` kartina revizyon akisi eklendi
  - son 4 revizyon tarih ve detayla listeleniyor
- `Proje Navigatoru` aktif set icin kaynak durumu rozetleri gosteriyor
  - `Plan Degisti`
  - `Kaynak Yok`
- bu paket buyutuldu
  - set bazli `senkron ozet` karti geldi
  - bagli setteki tum cepheler icin `synced / stale / missing` sayilari gosteriliyor
  - `Seti Senkronla` ile ayni bundle altindaki tum stale cepheler tek tikta kaynaktan yenileniyor
  - `Onerilen / Ince / Guclu Profil` presetleriyle tum sete profil kalinligi uygulanabiliyor
  - her bagli cephe icin satir bazli `Esle` butonu eklendi
  - `Set Revizyon Panosu` eklendi; bagli cephelerin son revizyonlari tek listede goruluyor ve tiklayinca ilgili cephe aciliyor
  - `Proje Navigatoru` artik set bazli `senkron / degisen / eksik` sayaçlari da gosteriyor
  - `Revizyon Karsilastirma` karti eklendi
    - aktif cephe ile kaynak plan arasinda alan alan fark gosteriliyor
    - genislik, yukseklik, satir, panel, acilim dizisi, kasa ve kayit mm farklari listeleniyor
  - serbest cizimde `PVC Baglantilari` paneli artik her cephe icin `Senkron / Plan Degisti / Kaynak Eksik` rozetleri gosteriyor
  - `Oda Listesi` ve status bar artik zincir bazli `PVC / stale / missing` ozetini yansitiyor
  - bu paket tekrar buyutuldu
    - `Set Fark Ekrani` eklendi; bagli sette farkli kalan tum cepheler satir satir listeleniyor
    - her satirda farkli alan sayisi, degisen alanlar listesi ve guncel uretim etkisi (`Profil / Cam / Kanat`) gorunuyor
    - serbest cizimde oda etiketinin altina dogrudan plan ustu `PVC / stale / missing` rozetleri geldi
    - toplu malzeme ve profil preset revizyon detaylari artik BOM etkisini de yaziyor
      - `Profil X m / Cam Y m² / Kanat N`
    - `Set Fark Ekrani` buyutuldu
    - her satir icin `Aktif / Kaynak` mini cephe onizlemesi eklendi
    - tek tik `Revizyon Paketi` HTML cikti akisi eklendi
    - bu cikti cephe ozeti, fark listesi ve revizyon akis tablolarini birlestiriyor
    - serbest cizimde artik zincir bazli oda rozeti yaninda duvar segmenti bazli sync badge'leri de var
      - `S1 / 2`
      - `S2 / !1`
      - `S3 / ?1`
    - `Revizyon Paketi` buyutuldu
      - farkli her cephe icin gercek `Aktif / Kaynak` mini teknik levha uretiliyor
      - farklar artik alan alan tablo halinde ayni sayfada listeleniyor
    - duvar segment badge'leri artik tiklanabilir
      - stale varsa onu tercih ederek ilgili PVC cephesini aciyor
      - missing / synced durumlari da segment seviyesinde gorunuyor
    - stale ve missing segment badge'lerine pulse/callout davranisi eklendi
- facade sync karsilastirmasi gereksiz false-positive vermesin diye
  - karsilastirma artik malzeme/kalinlik degil, esas geometriye odaklaniyor
- bundle performansi iyilestirildi
  - `buildTechnicalPrintHtml` artik dinamik import ile ayri chunk olarak yukleniyor
  - `buildBundleRevisionPacketHtml` artik ayri `revisionPacket` chunk olarak yukleniyor
- kontrol:
  - `npm.cmd run build` temiz gecti
  - build sonucu:
    - `index.js` yaklasik `472 kB`
    - `technicalPrint` ayri chunk yaklasik `31 kB`
    - `FreeDrawCanvas` ayri chunk yaklasik `93 kB`
  - not:
    - Vite `500 kB` chunk warning'i tekrar ortadan kalkti
  - sonraki temiz build:
    - `index.js` yaklasik `474 kB`
    - `technicalPrint` ayri chunk yaklasik `31 kB`
    - `revisionPacket` ayri chunk yaklasik `7 kB`
    - `FreeDrawCanvas` ayri chunk yaklasik `95 kB`

### Nisan 2026 - Cephe Programi ve Teknik Paket

- `src/components/freeDraw/freeDrawTechnicalPacket.ts` eklendi
  - plan paftasi ve tum cephe paftalarini tek HTML teknik pakette birlestiriyor
- `FreeDrawCanvas` icine yeni `Cephe Programi` paneli eklendi
  - hosted aciklik iceren duvar segmentleri listeleniyor
  - her satir icin `Sec`, `Pafta`, `PVC` aksiyonlari var
  - duvar tipi, segment etiketi, zincir boyu, sabit pay ve aciklik sayisi goruluyor
- serbest cizimde toplu aksiyonlar geldi
  - `Teknik Paket` tum plan + cephe sayfalarini bastiriyor
  - `PVC Paket` tum cepheleri tek seferde PVC galerisine aktarabiliyor
- `App.tsx` icinde toplu facade import akisi eklendi
  - tum cepheler `customTemplates` galerisine ekleniyor
  - ilk cephe otomatik olarak `technical` modda aktif projeye yukleniyor
  - teknik cepheler toplu proje galerisi mantigina baglandi
- free draw status bar artik teknik paket hazirlik bilgisini de gosteriyor
- `App.tsx` tarafina proje navigatoru eklendi
  - toplu facade import edilen setler artik `Proje Navigatoru` panelinde grup halinde gorunuyor
  - her set icindeki cepheler tek tikla yuklenebiliyor
  - serbest cizimden gelen cepheler artik teknik galeri mantigiyla bagli calisiyor
- cift yonlu baglanti eklendi
  - aktif PVC cephesinden `Kaynak Baglantisi` kartiyla serbest cizimdeki plana geri donulebiliyor
  - serbest cizimde secili zincir icin bagli PVC cepheleri ayrica listeleniyor
  - plan tarafinda secili zincir -> bagli cephe ac
  - PVC tarafinda aktif cephe -> plana git
- `PvcDesign` tipine `projectLink` metadata eklendi
  - source, bundle, chain, room, duvar tipi, segment ve aciklik sayisi tutuluyor
- serbest cizim modulu `React.lazy` ile ayristirildi
  - `FreeDrawCanvas` artik ayri chunk olarak yukleniyor
  - ana bundle boyutu anlamli sekilde dustu
  - build sonucu:
    - `index.js` yaklasik `461 kB`
    - `FreeDrawCanvas` ayri chunk yaklasik `112 kB`

- kontrol:
  - `npm.cmd run build` temiz gecti
  - bu turda bundle uyarisi da ortadan kalkti
  - sonraki build de temiz gecti

### Nisan 2026 - Fiziksel Layout Paketi

- `src/lib/canvasLayout.ts` eklendi
  - tek merkezden fiziksel kanvas geometrisi uretiyor
  - panel hucre alani ve gorunur panel alani ayrildi
  - dikey kayit ve yatay kayit artik gercek fiziksel rect olarak hesaplanıyor
- ana kanvas artik bu layout motorunu kullaniyor
  - panel render
  - dikey kayit render
  - yatay kayit render
  - secim kutulari
  - multi secim envelope
  - marquee secim
  - teknik referans rozetleri
  - OSNAP adaylari
  - offset referanslari
  - drag guide cizgileri
- panel gorunumleri artik kayit kalinligini fiziksel olarak hissettiriyor
  - panel gorunum kutusu kayit yuzeyine kadar geliyor
  - kayitlar artik panelin ustune binen sahte cizgi gibi degil, ayri profil parcasi gibi duruyor
- mini sablon onizlemeleri de yeni fiziksel layout mantigina gecirildi
- sag / sol ve ust / alt bolmelerin gorunur araliklari daha profesyonel hale geldi
- cetvel, cursor olculeri ve guide yerlestirme noktasi `innerRect` mantigina baglandi

### Editor / CAD

- panel secimi
- coklu secim
- marquee secim
- dikey ve yatay bolme
- panel ekleme / silme
- satir ekleme / silme
- kayit surukleyerek olcu degistirme
- zoom + pan
- ruler / cetvel
- crosshair
- floating HUD
- durum cubugu
- smart snap
  - esit dagitim
  - satir referansi
  - merkez referansi
  - referans guide snap
- drag sirasinda guide line ve snap etiketi
- kilitlenebilir referans guide sistemi
  - dikey guide ekleme
  - yatay guide ekleme
  - guide tasima
  - guide lock / unlock
  - guide isimlendirme
- eleman bazli manipulatorler
  - panel kenar tutamaclari
  - kanat kenar tutamaclari
  - cam kenar tutamaclari
  - kasa kalinlik tutamaclari
  - dikey/yatay kayit kalinlik tutamaclari
- katman gorunurlugu
  - cetvel
  - olcu
  - guide
  - HUD
  - profil
  - cam
  - donanim
  - not
- akilli overlay paletleri
  - secili kanat icin acilim tipi paleti
  - secili cam icin cam tipi paleti
  - secili kanat icin donanim kalite paleti
- preview'lu CAD komutlari
  - `copy`
  - `mirror`
  - `array`
  - `offset`
- hedef nokta secimli placement akisi
  - `copy` komutu hedef noktaya gore sol/sag veya ust/alt yerlestirme moduna giriyor
  - kanvasta canli hedef onizlemesi ve anchor cizgisi gosteriliyor
- iki asamali base point akisi
  - `copy` once kaynak nokta sonra hedef nokta istiyor
  - `move` once kaynak nokta sonra hedef nokta istiyor
- hedefe bagli akilli yerlestirme
  - panel kopyasi artik hedef panel uzerine ekleniyor
  - satir kopyasi artik hedef satir uzerine ekleniyor
  - panel tasima ayni satir icinde yeniden siralama yapiyor
  - satir tasima ust/alt yeniden siralama yapiyor
- satirlar arasi akilli panel transferi
  - panel farkli satira tasininca kaynak satir bosluk kaybetmiyor, komsu panel genisliyor
  - hedef satirda secili panel ikiye bolunerek tasinan panel yerlestiriliyor
- coklu panel blok islemleri
  - ayni satirdaki bitisik secimler blok olarak copy/move yapilabiliyor
  - blok ayni satirda yeniden siralanabiliyor
  - blok farkli satira tasinip kopyalanabiliyor
- step kontrollu array
  - `array 4 25` gibi komutlarla ritim kontrollu bolme yapiliyor
  - array genislikleri verilen step'e gore yuvarlanarak dagitiliyor
  - `array row 3 50` ile secili satir dikey dizilere bolunebiliyor
- interaktif mirror / offset secimi
  - `mirror` artik kanvasta eksen cizgisi sectiriyor
  - `offset 50` artik referans cizgiyi sectiriyor
  - offset modunda ghost cizgi gosteriliyor
- numeric move / nudge sistemi
  - `move 120` ile secili panel veya bitisik blok yatay kaydirilabiliyor
  - `move row -80` ile orta satirlar dikey kaydirilabiliyor
  - sol / sag ok tuslari panel veya blok icin snap bazli nudge yapiyor
  - yukari / asagi ok tuslari secili yatay kayit uzerinde satir nudge yapiyor
  - `Shift + ok` daha buyuk adimla kaydiriyor
  - command preview artik move displacement ghost gosteriyor
- placement lock ve komut gecmisi
  - `copy / move` hedef fazinda `X` ve `Y` eksen kilidi var
  - `F` ile placement kilitleri temizleniyor
  - mm girip `Uygula` ile placement mesafe kilidi verilebiliyor
  - komut satirinda `ArrowUp / ArrowDown` ile son komut gecmisi gezilebiliyor
  - son 5 komut command bar uzerinde hizli chip olarak listeleniyor
  - placement overlay artik `DX / DY / mesafe / aci` telemetry gosteriyor
  - base point ile hedef arasinda referans guide cizgileri ve `X / Y` olcu etiketleri var
  - placement hedef cozumu artik slot bazli
    - panel icine birebir tiklamadan sol / sag slotlardan hedef secilebiliyor
    - satir icine birebir tiklamadan ust / alt slotlardan hedef secilebiliyor
    - base point vektorune gore hedef yonu daha akilli yorumlaniyor
- offset artik sadece olcu degil, pattern bolme araci da oldu
  - `offset panel 300 3` secili paneli 300 mm ritimle boluyor
  - bitisik coklu secim varsa `offset panel ...` otomatik olarak blok gibi davranabiliyor
  - `offset block 300 2` secili bitisik panel blogunu ritmik modullere boluyor
  - `offset row 400 2` secili satiri 400 mm ritimle boluyor
  - pozitif deger soldan/ustten, negatif deger sagdan/alttan ritim kuruyor
  - command preview icinde offset pattern cizgileri gosteriliyor
  - command bar kisa yollari: `Panel Offset`, `Block Offset`, `Row Offset`
- profesyonel tracking modu
  - `F3` ile `OSNAP`
  - `F8` ile `ORTHO`
  - `F10` ile `POLAR`
  - komut satiri destegi: `osnap`, `osnap end`, `osnap mid`, `osnap cen`, `osnap int`, `ortho`, `polar 45`
  - panel, kasa ve ic kasa koseleri / orta noktalari / merkezleri icin nokta yakalama
  - panel bolucu kayitlar, satir ayiricilar ve guide cizgileri de snap adayi
  - dikey-yatay guide / kayit / satir eksen kesisimlerinde `INT` yakalama
  - placement sirasinda ortho ve polar takip aktif
  - telemetry overlay artik tracking modu ve osnap etiketini de gosteriyor
  - kanvasta canli `OSNAP` marker ve etiket overlay'i var
- vektor placement kilidi
  - placement input artik yalnizca `mm` degil, `dx,dy` de kabul ediyor
  - ornek: `120,80` veya `-60,0`
  - placement telemetry `VECTOR` moduna geciyor
  - mevcut mesafe kilidiyle ayni panelden yonetiliyor
- blok duzenleme komutlari
  - `trim left 80`
  - `trim right 80`
  - `extend left 60`
  - `extend right 60`
  - `trim top 50`
  - `extend bottom 50`
  - `center`
  - `center row`
  - bu komutlar secili panel/blogun veya secili satirin komsu elemanlara gore parametreli olarak buyuyup kuculmesini sagliyor
  - command preview artik trim/extend/center icin de ghost gosteriyor
- donanim katmani
  - kol isaretleri
  - mentese pozisyonlari
  - kilit isaretleri
  - surme rayi ve tilt sembolu
- detayli profil katmani
  - kasa kanal detaylari
  - kanat detay dikdortgenleri
  - bead / fitil siniri
  - ic destek cizgileri
  - drenaj slotlari

### Komut Sistemi

- numeric dimension command
- text command line
- desteklenen temel komutlar:
  - `set 900`
  - `offset -50`
  - `sv`
  - `sh`
  - `mirror`
  - `array 3`
  - `add left`
  - `add right`
  - `add top`
  - `add bottom`
  - `frame 76`
  - `mullion 60`
  - `right`
  - `left`
  - `tilt`
  - `slide`
  - `fixed`
  - `glass frosted`
  - `lib triple`

### Obje Bazli Secim

- artik sadece panel degil, su objeler de secilebiliyor:
  - dis kasa
  - panel
  - kanat
  - cam
  - dikey kayit
  - yatay kayit
- secili objeye gore farkli highlight geliyor
- inspector icinde `Secili Obje` karti var

### Kutuphane

- panel modulleri
  - sabit cam
  - sag kanat
  - sol kanat
  - vasistas
  - surme
- satir modulleri
  - cift kanat
  - uc bolmeli
  - balkon surgu
  - kapi + yan sabit
  - vasistas band
  - vitrin 4'lu

### Muhendislik / Uretim

- seri, cam ve donanim kataloglari
- panel engineering hesaplari
  - approx sash
  - approx glass
  - agirlik / alan kontrolleri
- proje sagligi / diagnostics
- akilli duzeltme onerileri
- kesim listesi motoru
- BOM
- grup bazli uretim listesi
- yazdirilabilir BOM HTML

## Guncel Cizim Deneyimi

- Studio / Teknik / Sunum gorunumleri var
- Teknik modda title block var
- Koyu teknik pafta hissi var
- secili panel veya obje icin command hedefi otomatik kuruluyor
- kutuphane ve command line birlikte calisiyor

## Son Derleme Durumu

- `npm.cmd run build` temiz geciyor

## Son Tamamlanan Buyuk Adim

- cekirdek duzeltme paketi eklendi
  - `Yeni Proje` artik ornek sablon yuklemiyor; once genislik/yukseklik alan bos kasa modal'i aciliyor
  - yeni proje tek panel tek satir bos kasa ile basliyor
  - sag paneldeki sayisal alanlar `Enter/blur` ile commit olan guvenli `NumberField` yapisina gecti
  - panel genisligi ve satir yuksekligi editleri daha guvenilir hale geldi
  - cizim altindaki panel olculeri ve saga alinan satir olculeri artik tiklanip dogrudan duzenlenebiliyor
  - sablon galerisine `+ Sablon Ekle`, `Duzenle`, `Sil` akisi geldi
  - ozel sablonlar local storage uzerinden korunuyor
- malzeme ve kalinlik paketi eklendi
  - yeni `Malzeme Cinsi` alani: `Aldoks`, `C60`, `Isi Yalitimi`, `Surme Sistem`, `Sistem Serisi`
  - panel engineering motoru artik kasa / kayit kalinligi ve malzeme cinsini net cam ve net kanat hesabina katiyor
  - kasa kalinligi buyudukce cam alani artik gercekten dusuyor
  - cam kataloglarina nominal kalinlik / gosterim etiketi eklendi
  - panel uzerinde uygun boyutta alan varsa cam kalinligi etiketi yaziliyor
- cizim geometrisi ve profesyonellik paketi eklendi
  - cizim olcegi artik kasa kalinligini dikkate alarak kuruluyor, bu sayede pencere cercevesi daha dogru ortalaniyor
  - `profileLayout` gercek kasa/kanat/cam derinliklerine daha yakin hale getirildi
  - ust ve yan cetveller daha minimalist hale getirildi
  - crosshair artik daha ince ve imlec merkezinde gorunen nokta ile geliyor
  - eski kayitli sablon/projeler icin `materialSystem` migration guvencesi eklendi
- profesyonel `OSNAP + ORTHO + POLAR` paketi eklendi
  - panel, kasa, ic kasa ve guide kesisimleri uzerinde noktaya yapisma calisiyor
  - `copy / move` placement akisi artik osnap ile hedeflenebiliyor
  - placement telemetry `free / ortho / polar` modlarini gosteriyor
  - komut bar ve durum cubugunda takip modlari gorunur hale geldi
  - `osnap`, `ortho`, `polar 45` komutlari eklendi
- ikinci buyuk teknik pafta paketi eklendi
  - teknik modda tam sayfa `page frame` geldi
  - secili panel icin ayri `Detay Levhasi / Sayfa 02` eklendi
  - mini eskiz, net kanat/cam ve detay satirlari tek levhada toplaniyor
  - placement input alanina `dx,dy` vektor kilidi baglandi
- blok trim / extend / center paketi eklendi
  - secili panel veya bitisik blok komsu panellere gore soldan/sagdan trimlenebiliyor
  - secili satir ustten/alttan trimlenebiliyor
  - `center` ve `center row` komutlari komsu bosluklari dengeleyerek ortalama yapiyor
  - command bar presetlerine yeni profesyonel duzenleme komutlari eklendi
- `array grid` komutu eklendi
  - `array grid 3 2 25 50`
  - secili panel/satir bandini 2D grid modulu olarak kuruyor
  - kolon ve satir icin ayri step/ritim girebiliyor
- tekrarli `copy` komutu eklendi
  - `copy 3 50` ile panel veya secili blok step kontrollu tekrarli kopyalanabiliyor
  - `copy row 3 50` ile satir step kontrollu tekrarli kopyalanabiliyor
- `offset` zinciri eklendi
  - `offset 50 3` ile paralel guide zinciri uretiliyor
- `move` komutu buyutuldu
  - numeric displacement destekli
  - keyboard nudge ile entegre
  - panel bloklari ve satirlar icin ghost displacement preview var
- teknik pafta detay katmani buyutuldu
  - secili panel icin teknik detail callout kartlari var
  - mini kesit / profil detayi paneli eklendi
  - teknik modda secili panelin net kanat, net cam, seri ve agirlik bilgisi pafta ustunde gosteriliyor
  - detay listesi eklendi
    - `D1-D4` numarali panel / kanat / cam / sistem satirlari
    - callout kartlari ile teknik liste birbirine referansli
  - `copy 3 50`
  - `copy row 3 50`
  - hedef panel/satir uzerine birden fazla kopyayi fit ederek yerlestiriyor
  - bitisik coklu secimlerde blok halinde tekrarli copy destekleniyor
- zincir `offset` komutu eklendi
  - `offset 50 3`
  - secilen referansa gore paralel guide zinciri uretiyor
  - dikey/yatay kayit, kasa ve guide referanslarindan calisiyor
- komut onizlemeleri buyutuldu
  - `grid array` icin row + cell ghost preview
  - coklu secimde blok envelope ve blok ghost onizlemesi
  - `copy/move` artik bitisik blok secimlerde daha gercek placement hissi veriyor
  - tekrarli copy icin coklu hayalet tile onizlemesi var
  - zincir offset icin birden fazla paralel ghost cizgi gosteriliyor
- teknik pafta panosu eklendi
  - musteri / proje / seri / cam / donanim / renk
  - panel ve kanat adedi
  - profil metraji ve cam alani
  - kisa legend/acilim aciklamalari
- inspector tarafinda coklu secim ve malzeme metinleri temizlendi
- hizalama / dagitim paketi eklendi
  - `align left/right/top/bottom/center/middle`
  - `distribute`
  - `distribute rows`
  - `match width`
  - `match height`
  - command preview ve command chip destegi baglandi
- secili kayit icin dogrudan cizim ustu toolbar eklendi
  - dikey kayit: `-50`, `+50`, `50/50`, `33/67`, `67/33`
  - yatay kayit: `-50`, `+50`, `50/50`, `33/67`, `67/33`
- secili panel / blok / satir icin cizim ustu CAD komut seritleri eklendi
  - panel komutlari: `SV`, `SH`, `Copy`, `Move`, `Array`
  - panel uret seridi: `Add L`, `Add R`, `Offset`, `Grid`, `Triple`
  - blok hizalama seridi: `Align L`, `Align R`, `Center`, `Distribute`, `Match`
  - blok operasyon seridi: `Trim`, `Extend`, `Copy`, `Move`
  - satir komutlari: `Align T/B`, `Center Row`, `Distribute Rows`, `Match Height`
  - satir operasyon seridi: `Copy Row`, `Move`, `Array Row`, `Mirror`, `Offset Row`
- guide hizalama paketi eklendi
  - komutlar: `align guide left/right/center/top/bottom/middle`
  - secili panel / blok icin dikey guide hizalama palette'i
  - secili satir icin yatay guide hizalama palette'i
  - command preview artik nearest guide ghost ve guide line gosteriyor
- teknik pafta profesyonellesti
  - title block icine revizyon / durum / kontrol alani eklendi
  - teknik bilgi panosuna uretim ozeti satirlari eklendi
  - detay levhasi buyutuldu
  - detay levhasina kesim ozeti / kontrol / revizyon bilgisi baglandi
- `npm.cmd run build` temiz geciyor

## Siradaki En Dogru Buyuk Adimlar

### Nisan 2026 - Fiziksel Preview + Direkt Kayit Olcusu

- `copy / move / array / distribute / grid` preview katmani fiziksel layout mantigina daha yakin hale getirildi
- preview icinde panel tekrarlarinin arasinda artik kayit boslugu/segment ayrimi gosteriliyor
- placement preview panel tarafinda blok kopya ve tek panel kopya daha fiziksel ghost ile gosteriliyor
- placement preview row tarafinda tekrarli satir kopyalari yatay kayit boslugu ile gosteriliyor
- secili dikey kayit ustunde dogrudan olcu etiketi tiklanip komut editoru acilabiliyor
- secili yatay kayit ustunde dogrudan olcu etiketi tiklanip satir yuksekligi degistirilebiliyor
- `npm.cmd run build` temiz geciyor

### Nisan 2026 - Akilli Yerlesim + HUD Input + Teknik Yazi Ciktisi

- `copy / move` placement akisi hedef panel/satir icine sigacak sekilde kaynak olcuyu koruyup gerekirse otomatik fit ediyor
- placement preview badge'lerinde `Fit` durumu gosteriliyor
- secili dikey kayit ve yatay kayit icin kanvas ustunde mini `HUD` olcu editoru eklendi
- HUD input ile panel genisligi ve satir yuksekligi dogrudan `mm` girilerek uygulanabiliyor
- yeni `src/lib/technicalPrint.ts` ile tam sayfa teknik pafta / uretim ciktisi HTML motoru eklendi
- ana toolbar'a `Teknik PDF` butonu eklendi
- Electron tarafina `project:print-technical` kanali eklendi
- teknik ve BOM yazdir akisi print dialog acacak sekilde guncellendi
- `npm.cmd run build` temiz geciyor

### Nisan 2026 - Cakisma Analizi + Alternatif Hedef + Detay Levhasi

- placement preview artik hedef panel/satirin gercek kapasitesini `mm` bazinda analiz ediyor
- `copy / move` sirasinda `Fit %xx` veya `Limit` uyarisi gosteriliyor
- hedef dar geldiginde preview altinda alternatif panel/satir onerisi cikiyor
- `offset` preview icinde gecersiz kalan paralel cizgi sayisi raporlaniyor
- secili dikey/yatay kayit uzerindeyken dogrudan klavyeden sayi yazip HUD input acilabiliyor
- teknik baski cikti motoru genisletildi:
  - genel pafta sayfasi
  - uretim / kesim listesi sayfasi
  - `D1-D6` referansli detay levhasi
- `npm.cmd run build` temiz geciyor

### Nisan 2026 - Limitli Preview + Guide Ulasilabilirlik + Detay Risk Kartlari

- `guide-align` preview artik sadece en yakin guide'i gostermiyor; ayni zamanda hedefe ulasilip ulasilamayacagini da analiz ediyor
- guide komutlarinda `Hazir`, `Max`, `Limit` ve alternatif guide onerisi badge'leri eklendi
- `trim / extend` preview artik komsu panel/satir payina gore gercek uygulanabilir miktari gosteriyor
- kenar duzenleme preview'sinda:
  - tam uygulanabilir durum
  - kisitli uygulanabilir durum
  - dis sinir / komsu payi yetersiz durumu
  ayrisiyor
- `align` preview artik zaten hizaliysa bunu dogrudan `Hazir` olarak gosteriyor
- command preview overlay icin yeni durum stilleri eklendi:
  - `warning`
  - `error`
  - `success`
- teknik baski detay levhasi daha muhendislik odakli hale getirildi:
  - detay kartlarinda `Uygun / Sinira Yakin / Riskli` durumu
  - `A-A / B-B / C-C` kesit referans ciplari
  - kart bazli teknik not
- `npm.cmd run build` temiz geciyor

### Nisan 2026 - Akilli Tutamac + Auto Slot Ghost + Resmi Pafta Bilgisi

- dikey/yatay kayit surukleme artik tum satiri oransal bozmak yerine komsu panel/satir mantigiyla calisiyor
- drag sirasinda:
  - gercek uygulanabilir `mm` miktari
  - komsu denge bilgisi
  - `Limit / komsu payi`
  ipuclari gosteriliyor
- secili panel genisligi ve satir yuksekligi handle'lari artik daha fiziksel davranis veriyor
- `copy / move` placement preview'da alternatif hedef sadece metin olarak degil, kanvasta yesil `Auto Slot` ghost olarak da gosteriliyor
- teknik kanvas title block buyutuldu:
  - `SAYFA 01`
  - sistem serisi
  - revizyon / durum / kontrol bilgisi
- mini kesit paneli derinlestirildi:
  - `A-A KESIT`
  - profil derinligi
  - cam kalinligi
  - donanim max agirlik bilgisi
- print/teknik HTML ciktilarinda sayfa footer'lari eklendi:
  - `Sayfa 01 / 03`
  - revizyon / durum
  - kesit / uretim / detay basligi
- `npm.cmd run build` temiz geciyor

## Nisan 2026 - Auto Slot Yonlendirme + Trim/Extend Overlay + Derin Kesit

- `copy/move` hedefi dar geldiginde sistem artik en uygun alternatif `Auto Slot`u otomatik uyguluyor
- secili dikey kayit overlay'ine dogrudan `Trim L / Ext L / Trim R / Ext R` eklendi
- secili yatay kayit overlay'ine dogrudan `Trim T / Ext T / Trim B / Ext B` eklendi
- mini teknik kesit karti daha gercek profil mantigina cekildi:
  - ikinci `B-B CAM` etiketi
  - ic/dis chamber cizgileri
  - cita/bead siniri
  - drenaj ve thermal referans cizgileri
  - `Olcek 1:2 / Ic-Dis Profil` etiketi
- bu paket sonrasi hedef:
  - `trim/extend` icin otomatik guide limit kilidi
  - seri bazli daha gercek profil geometri kutuphanesi
  - baski/PDF teknik layout'u daha da resmi hale getirmek

## Nisan 2026 - Guide Kilit + Profil Geometri Kutuphanesi + Resmi Pafta

- `trim/extend` komutlari artik en yakin uygun guide'a otomatik kilitlenebiliyor
  - hem komut sonucu hem preview katmani guide adini ve kilit durumunu gosteriyor
- yeni `src/lib/profileGeometryCatalog.ts` eklendi
  - her seri icin resmi kod
  - frame/sash chamber cizgileri
  - thermal band ve drainage slot tanimlari
  - kesit notu ve referans seti
- mini teknik kesit karti artik secili seri geometri verisini kullaniyor
- teknik print paftasi daha resmi hale getirildi
  - sayfa register bandi
  - cizim kodu kutusu
  - onay/revizyon grid'i
  - SVG paftada title block ve kesit legend blogu
  - detay kartlarinda seri bazli profil sketch cizgileri
- `npm.cmd run build` temiz gecti

### 1. Daha gercek CAD komutlari

- `offset` icin birden fazla paralel zincir offset
- `move/copy` icin farkli satirlara grup halinde daha akilli paste preview
- `array grid` icin secili modulun komsu panellere zarar vermeden lokal grid edit akisi
- `copy` icin hedef noktadan mutlak mesafe / base-point ofsetli yerlestirme
- `move` icin ayni mantikta numeric displacement akisi
- `trim/extend` komutlarini dogrudan kayit tutamaclarina baglamak
- `align/distribute/match` icin daha zengin preview ve guide snap davranisi

### 2. Obje bazli daha akilli manipulatorler

- secili kanat icin kol yonu / acilim overlay'i
- secili kayit icin referans eksenine gore hizali offset manipulatoru
- cam ve kanat icin akilli tutamaclarda numeric mini input

### 3. Katman ve pafta derinligi

- not katmanina teknik aciklama / referans numarasi / musteri notu overlay'i
- donanim katmanina daha ayrintili aksesuar sembolleri
- teknik modda daha zengin pafta / baslik blogu
- teknik kesit gorunumu ve detay callout balonlari
- teknik referans listesini sayfalanabilir / yazdirilabilir hale getirmek
- teknik bilgi panosunu PDF/print ciktisina birebir tasimak
- detay levhasini tam baski sayfasi mantigina cevirmek

### 4. Uretim seviyesi gelisim

- stok boy optimizasyonu
- kesim plani paftasi
- teklif / maliyet

## Dikkat Edilecek Teknik Borclar

- `src/App.tsx` cok buyudu
- ileride su parcalara bolunmeli:
  - `components/canvas/`
  - `components/inspector/`
  - `components/command-bar/`
  - `components/library/`
- `App.tsx` icinde eski kullanilmayan bazi helper'lar kalmis olabilir
- ileride `object selection` tipi store'a alinabilir
- `src/lib/manufacturingEngine.ts` icinde eski encoding kaynakli birkac metin temizlenebilir

## Calistirma

```powershell
npm.cmd install
npm.cmd run dev
```

## Build Kontrolu

```powershell
npm.cmd run build
```

## Exe Uretme

Sadece kullanici isterse:

```powershell
npm.cmd run dist
```

## GitHub Guncelleme

Sadece kullanici isterse:

```powershell
git add .
git commit -m "..."
git push
```

## Nisan 2026 - Canvas Koordinat Duzeltmesi + Serbest Cizim Modu

- `src/lib/canvasPointer.ts` eklendi.
  - canvas/surface icinde client -> svg -> world koordinat donusumu ortaklastirildi
  - `devicePixelRatio`, `getBoundingClientRect`, `pan`, `zoom` ayni hatta toplandi
- `src/App.tsx` icindeki `PvcCanvas` cursor hesabinda yeni helper kullaniliyor
  - crosshair ile gercek mouse imleci ayni koordinat sistemine cekildi
- Uygulamaya ayri bir `Serbest Cizim` modu eklendi
  - `src/components/freeDraw/FreeDrawCanvas.tsx`
  - `src/components/freeDraw/useFreeDrawStore.ts`
  - `src/components/freeDraw/freeDrawTools.ts`
  - `src/components/freeDraw/freeDrawSnap.ts`
- Free draw modunda su araclar var:
  - `LINE`
  - `RECTANGLE`
  - `CIRCLE`
  - `ARC`
  - `POLYLINE`
  - `DIMENSION`
  - `TEXT`
  - `ERASE`
- Free draw modunda su davranislar var:
  - endpoint / midpoint / perpendicular / grid snap
  - `F8` ortho
  - mouse wheel zoom
  - middle mouse veya `Space + drag` pan
  - `ESC`, `Enter`, `Delete`, `Ctrl+Z`, `Ctrl+Y`, `Ctrl+0`
  - ghost preview / rubber band
  - secili obje highlight
  - status bar koordinat gostergesi
  - `SVG` ve `PNG` export
- Bu turda `.exe` uretilmedi
- Bu turda GitHub guncellenmedi
- `npm.cmd run build` temiz gecti

## Nisan 2026 - Serbest Cizim Icinde Akilli Kapi/Pencere Modulleri

- `Free Draw` moduna genel cizim araclarina ek olarak akilli:
  - `Pencere`
  - `Kapi`
  - `Surme`
  araclari eklendi
- Bu araclar tikla-surukle ile dogrudan dograma modulu uretiyor
- Moduller artik:
  - kasa
  - ic kasa
  - cam alanlari
  - bolmeler
  - acilim diyagonalleri
  - kapi kolu
  - surme isareti
  ile birlikte ciziliyor
- Secili moduller icin hizli ust toolbar kontrolleri eklendi:
  - `Pencere`
  - `Kapi`
  - `Surme`
  - `Sabit`
  - `Sol`
  - `Sag`
  - `Cift`
  - `Uclu`
  - `Vasistas Ust`
- Akilli moduller icin secim rahatlatildi
  - sadece profil cizgisine degil, modulun icine tiklayinca da seciliyor
- `freeDrawTools` ve `useFreeDrawStore` icinde yeni `opening` entity mantigi var
- `npm.cmd run build` temiz gecti

## Nisan 2026 - Hazir Moduller, Bolme Oranlari ve Suruklenebilir Kayitlar

- Serbest cizimde akilli moduller buyutuldu:
  - `Tek Pencere`
  - `Cift Pencere`
  - `Uclu Pencere`
  - `Vasistasli`
  - `Tek Kapi`
  - `Kapi + Sabit`
  - `Surme 2`
  - `Surme 3`
- Yeni veri modeli:
  - `preset`
  - `leafTypes`
  - `columnRatios`
- Secili modul icin:
  - canli genislik olcu cizgisi
  - canli yukseklik olcu cizgisi
  - her bolme icin alt genislik etiketi
  eklendi
- Dikey bolme ayiricilari artik handle ile suruklenebiliyor
  - komsu hucreler birlikte yeniden oranlaniyor
- Store tarafinda preset degisimi kategori, minimum yukseklik, bolme sayisi ve kanat dizilimini otomatik guvenli sekilde guncelliyor
- `npm.cmd run build` tekrar temiz gecti

## Nisan 2026 - Duvar Araci ve Hosted Kapi/Pencere Yerlesimi

- Serbest cizime `Duvar` araci eklendi.
- Duvarlar ortho mantigiyla ciziliyor ve kalinlik degeri tasiyor.
- Duvar cizgileri:
  - dolu teknik band
  - centerline
  - uzunluk / kalinlik etiketi
  ile gorunuyor.
- Secili duvar icin kalinlik presetleri eklendi:
  - `140`
  - `200`
  - `240`
  - `300`
- Duvar uzerine `Pencere`, `Kapi`, `Surme` cizilirse artik akilli hosted opening olusuyor.
- Hosted opening mantigi:
  - duvar eksenine otomatik oturur
  - duvar kalinligini korur
  - plan gorunuslu kapi/pencere cizer
  - yatay/dusey duvar yonunu algilar
- Hosted opening icin move/resize davranisi duvar icinde limitli calisir.
- Hosted plan gorunusunde:
  - kapi acilim cizgileri
  - surme / cam plan sembolleri
  - plan frame/cut alanlari
  ciziliyor.
- `npm.cmd run build` temiz gecti

## Nisan 2026 - Duvar Boslugu ve PVC'ye Aktar

- Hosted opening'ler artik duvarda gercek bosluk olusturuyor.
  - yatay duvarda sol/sag segmentlere ayriliyor
  - dusey duvarda ust/alt segmentlere ayriliyor
- Duvar kesisimlerinde join marker gosterimi eklendi.
- Secili akilli modul icin `PVC'ye Aktar` butonu eklendi.
- Bu aktarim:
  - serbest cizimdeki secili kapi/pencereyi
  - duzenlenebilir bir PVC taslagina
  - otomatik panel genislikleri ve acilim tipleriyle
  ceviriyor.
- Hosted opening aktariminda duvar plan span'i kullaniliyor; yukseklik kategoriye gore mantikli taslak degerle kuruluyor.
- `npm.cmd run build` tekrar temiz gecti.

## Nisan 2026 - Zincir Duvar, Hosted Slot ve Cephe Aktarimi

- `Duvar` araci zincirleme calisir hale getirildi; her segmentten sonra bir sonraki duvar ayni uc noktadan devam eder.
- Hosted kapi/pencereler duvar uzerinde bos slota otomatik oturur.
  - yeni aciklik cizerken
  - duvar uzerinde tasirken
  - hosted genislik/yukseklik degistirirken
  sistem en uygun bosluga fit eder.
- Secili duvarda hosted aciklik sayisi status bar ve duvar kartinda gosteriliyor.
- Secili duvar icin `Cepheyi PVC'ye Aktar` butonu eklendi.
- Bu aktarim secili duvardaki tum hosted acikliklari tek bir PVC cephe taslagina ceviriyor.
  - bosluklar `Sabit Pay`
  - acikliklar panel panel acilim tipleriyle
  - gerekirse ust sabit satirla
  olusuyor.
- `npm.cmd run build` temiz gecti.

## Nisan 2026 - Oda Alani ve Duvar Olculendirme

- Zincir duvar icin `Duvari Kapat` ve `Zinciri Bitir` kontrolu eklendi.
- Ayni duvar zinciri kapanirsa sistem artik oda bolgesini algiliyor.
  - yesil yari saydam dolgu
  - `Oda`
  - `m2` alan etiketi
  gosteriliyor.
- Secili duvar icin otomatik cephe olculendirme overlay'i eklendi.
  - toplam duvar boyu
  - hosted acikliklar
  - aradaki sabit pay segmentleri
  zincir olcu olarak ciziliyor.
- Hosted acikliklar duvar uzerinde tasinirken ve buyutulurken bos slotlara otomatik fit olmaya devam ediyor.
- `npm.cmd run build` tekrar temiz gecti.

## Nisan 2026 - L/T/X Birlesim ve Genel Oda Olculeri

- Duvar zinciri cizerken baslangic noktasina yaklasinca otomatik kapanma eklendi.
- Duvar kesisimleri artik siniflandiriliyor:
  - `L`
  - `T`
  - `X`
  marker olarak gosteriliyor.
- Oda bolgesi secili duvar zincirine bagli genel olculendirme aliyor:
  - toplam en
  - toplam boy
  - cevre
- Status/tool alaninda secili oda icin alan ve cevre bilgisi gosteriliyor.
- `Duvar` araci zincir cizerken aktif segment bilgisi gosteriliyor.
- `npm.cmd run build` temiz gecti.

## Nisan 2026 - Duvar Tipi ve Oda Metadata Paketi

- `FreeDrawWallEntity` veri modeline:
  - `wallType`
  - `roomName`
  alanlari eklendi.
- desteklenen duvar tipleri:
  - `Ic Duvar`
  - `Dis Duvar`
  - `Bolme`
  - `Giydirme`
- `FreeDrawDraft` artik aktif duvar zinciri icin de tip ve oda adi tasiyor.
- `useFreeDrawStore` buyutuldu:
  - `updateWallDraftMeta`
  - `updateWallChain`
  aksiyonlari eklendi.
- Duvar cizimi sirasinda aktif zincir toolbar'i artik:
  - duvar tipi secimi
  - oda adi girisi
  sunuyor.
- Secili duvar toolbar'i artik zincir seviyesinde calisiyor:
  - duvar tipi tum zincire uygulanabiliyor
  - kalinlik presetleri tip bazli degisiyor
  - oda adi zincir bazinda duzenlenebiliyor
- Oda algilama/render buyutuldu:
  - oda etiketi artik `Oda` sabiti degil, zincirin `roomName` bilgisini kullaniyor
  - room fill ve room meta duvar tipine gore farkli gorsel tonlar aliyor
  - oda icinde `duvar tipi / segment sayisi` meta satiri gorunuyor
- Duvar etiketleri de tip bazli kisaldi:
  - `IC`
  - `DIS`
  - `BLM`
  - `GYD`
- Status bar ve secili duvar HUD artik:
  - oda adi
  - duvar tipi
  - hosted aciklik sayisi
  ile daha zengin bilgi gosteriyor.
- `npm.cmd run build` temiz gecti.

## Nisan 2026 - Mimari Plan Sembolleri ve Oda Hizli Akisi

- Serbest cizimde duvar tipleri artik sadece renk degil, plan sembolu de uretiyor:
  - `Dis Duvar` icin yalitim tarzi diagonal isaretler
  - `Bolme` icin hafif bolme/stud tarzi tekrarli cizgiler
  - `Giydirme` icin cam cephe ritim cizgileri
- Bu semboller secili/preview duvar mantigina zarar vermeden `renderWallEntity` katmanina baglandi.
- Duvar/oda toolbar'i buyutuldu:
  - hazir oda isim presetleri
    - `Salon`
    - `Mutfak`
    - `Yatak Odasi`
    - `Banyo`
    - `Ofis`
    - `Balkon`
  - hem aktif duvar zinciri draft'inda
  - hem secili zincir duzenlemesinde
  tek tikla kullanilabiliyor.
- Kanvasa yeni `Oda Listesi` paneli eklendi.
  - kapanan tum oda zincirleri listeleniyor
  - isim
  - m2
  - cevre
  bilgisi gosteriliyor
  - secili zincir listede highlight oluyor
- Oda etiketi ve room meta satiri duvar tipini ve segment sayisini daha net gosteriyor.
- `npm.cmd run build` temiz gecti.

## Nisan 2026 - Katmanli Plan Kesiti + Mekan Cizelgesi + Plan Pafta

- `FreeDrawCanvas` buyutuldu:
  - duvar tipine gore katmanli plan kesiti ciziliyor
    - `Dis Duvar`: ic/dis kabuk ve izolasyon cekirdegi
    - `Bolme`: tekrarli ayirici/stud cizgileri
    - `Giydirme`: cam cephe katman cizgileri
  - L/T/X join marker'lara ek olarak teknik join geometry overlay geldi
- serbest cizim toolbar'ina `Plan Pafta` butonu eklendi
  - mevcut plani dogrudan teknik yazdir / PDF akisina cevirebiliyor
- yeni dosya:
  - `src/components/freeDraw/freeDrawPrint.ts`
  - serbest cizim icin ayri teknik plan HTML motoru
  - plan gorunusu + oda cizelgesi + duvar cizelgesi ciktiyor
- yeni duzenlenebilir `Mekan Cizelgesi` karti eklendi
  - her oda icin `Sec` butonu
  - isim duzenleme input'u
  - duvar tipi select'i
  - alan ve cevre metrikleri
  - secili zincir satiri highlight oluyor
- kanvas ustundeki `Oda Listesi` paneli korundu; HTML cizelge ise duzenleme icin eklendi
- `npm.cmd run build` temiz gecti

## Nisan 2026 - Oda Secimi + Aks Overlay + Resmi Plan Paftasi

- Serbest cizimde `select` modunda oda poligonunun icine tiklanarak ilgili duvar zinciri secilebiliyor.
- Bu secim obje secimini bozmuyor:
  - once obje hit-test yapiliyor
  - bos alanda kalinirsa oda secimi devreye giriyor
- Kanvas ustundeki `Oda Listesi` paneli artik tiklanabilir hale geldi.
  - satira tiklayinca ilgili oda zinciri seciliyor
  - secili oda panelde vurgulaniyor
- HTML `Mekan Cizelgesi` karti buyutuldu:
  - satirin tamami tiklanabilir
  - `Sec` butonu korunuyor
  - input/select alanlari satir secimini yanlis tetiklemeden calisiyor
- Secili oda icin yeni `aks overlay` eklendi:
  - `A / B`
  - `1 / 2`
  bubble akslari
  - oda etrafinda teknik referans cizgileri
- Kanvasa yeni `Duvar Tipleri` legend paneli eklendi.
  - oda zincirlerinden duvar tipi sayimlari uretiliyor
  - `Ic / Dis / Bolme / Giydirme` dagilimi panelde gorunuyor
- `freeDrawPrint.ts` buyutuldu:
  - yazdirilabilir plan SVG artik global aks overlay tasiyor
  - plan icine legend kutusu geldi
  - saga `Duvar Tipi Ozet` tablosu eklendi
  - plan paftasi daha resmi ve teknik hale geldi
- `npm.cmd run build` temiz gecti

## Nisan 2026 - Cift Yonlu Hover + Canli Chain Highlight + Resmi Revizyon Blogu

- Serbest cizimde oda/duvar odagi artik secimden bagimsiz bir `hover chain` mantigi tasiyor.
  - oda poligonu uzerine gelince ilgili zincir canli highlight oluyor
  - HTML `Mekan Cizelgesi` satiri uzerine gelince kanvastaki oda ve duvar zinciri de highlight oluyor
  - kanvastaki `Oda Listesi` SVG paneli de ayni sekilde tiklanabilir ve hover destekli calisiyor
- `renderRoomRegion` buyutuldu:
  - `selected`
  - `active`
  siniflari eklendi
  - oda fill artik hover ve secimde farkli tonlarla vurgulaniyor
- `renderWallEntity` buyutuldu:
  - aktif zincirdeki tum duvarlar `active-chain` olarak vurgulaniyor
  - hosted acikliklar da ayni aktif zincir rengine baglandi
- Duvar kose birlesimleri daha teknik hale getirildi:
  - yeni `renderWallJoinPatch` yardimcisi eklendi
  - `L / T / X` kesisimlerinde dolgu/trim benzeri birlesim patch'leri ciziliyor
  - aktif veya secili zincirde bu birlesimler daha belirgin gorunuyor
- Status bar artik secili duvar disinda aktif/hover edilen oda zincirini de ozetliyor.
- `freeDrawPrint.ts` daha da resmi hale getirildi:
  - `DIS / IC / BLM / GYD` legend kodlari
  - `Aks Cizelgesi`
  - `Revizyon Blogu`
  - `PLAN-01` pafta mantigi
  eklendi
- `npm.cmd run build` temiz gecti

## Nisan 2026 - CRM + DXF + Ticari Teklif Katmani

- `pricingEngine.ts` buyutuldu:
  - `PricingConfig` artik firma bilgilerini de tasiyor
  - firma adi, slogan, telefon, e-posta, adres ve teklif gecerlilik gunu eklendi
  - `buildQuoteHtml` artik:
    - firma bloklari
    - tasarim onizleme SVG'si
    - daha profesyonel teklif yerlesimi
    - gecerlilik tarihi
    ureten ticari dokumana donustu
- yeni dosya:
  - `src/lib/dxfExport.ts`
  - PVC tasarimini temel `DXF` cizgilerine ceviren export motoru eklendi
  - dis kasa, dikey kayitlar, yatay kayitlar ve panel etiketleri uretiyor
- yeni dosya:
  - `src/lib/customerRegistry.ts`
  - localStorage tabanli hafif CRM yardimcilari eklendi
  - musteri bazli proje kaydi ve son teklif bilgisi tutuluyor
- `App.tsx` buyutuldu:
  - `CUSTOMER_REGISTRY_STORAGE_KEY` eklendi
  - `customerRegistry` state ve persistence eklendi
  - `rememberCustomerFromDesign` / `applyCustomerRegistryEntry` yardimcilari eklendi
  - proje kaydedince musteri hafizasina isleniyor
  - teklif yazdirinca musteri kaydina son teklif tutari yaziliyor
  - yeni `DXF` export butonu hero bar'a eklendi
  - hero status row artik:
    - kaydedilmemis degisiklikler rozeti
    - farkliysa `Autosave Geri Yukle`
    gosterebiliyor
  - autosave payload'i artik sadece design degil `savedAt + design` olarak saklaniyor
  - geri uyumluluk icin eski plain-design autosave formatini da okuyabiliyor
  - `materials` sekmesine `Musteri Hafizasi` karti eklendi
  - `pricing` sekmesine firma/teklif ayar karti eklendi
- `styles.css` buyutuldu:
  - `dirty-indicator`
  - `customer-crm-*`
  - `pricing-company-*`
  siniflari eklendi
- `npm.cmd run build` temiz gecti
- not:
  - ana bundle tekrar `500 kB` ustu uyarisi veriyor
  - teknik olarak hata degil, ama sonraki turda `pricing / CRM / technical packet` taraflarini daha fazla code-split etmek mantikli

## Nisan 2026 - Segment Tooltip + Diff Meta Temizligi

- `FreeDrawCanvas` tarafinda bagli PVC status katmani buyutuldu:
  - yeni `buildSegmentKey` helper'i ile chain/segment anahtarlari tek merkezden uretiliyor
  - `linkedFacadeStatusBySegment` artik sadece `linked/stale/missing` degil `diffCount` da tasiyor
  - `linkedFacadeStatusByChain` de zincir bazli toplam fark sayisini tasiyor
- duvar segmenti sync badge'leri buyutuldu:
  - hover ile acilan yeni SVG tooltip paneli eklendi
  - tooltip icinde segmentteki bagli cepheler `Senkron / Plan Degisti / Kaynak Eksik` durumu ile listeleniyor
  - her satirda `fark` ve `revizyon` sayisi gorunuyor
  - stale/missing segmentleri ayirt etmek daha kolay hale geldi
- secili zincirdeki `PVC Baglantilari` paneli artik:
  - toplam fark sayisini ust metada gosteriyor
  - her bagli cephe satirinda `X fark` badge'i tasiyor
- oda bolgesi ve `Oda Listesi` tarafi da buyutuldu:
  - oda sync rozeti artik `PVC / ! / ? / Delta` bilgisini tek satirda gosteriyor
  - zincir bazli durum ozetleri daha gorunur hale geldi
- `App.tsx` tarafinda linked facade diff hesaplari temizlendi:
  - yeni `customTemplateDiffMap` ile fark satirlari tek merkezde hesaplanip tekrar kullaniliyor
  - `linkedFacadeDesigns`, `currentBundleSyncItems` ve `currentBundleDiffRows` ayni diff verisini paylasiyor
  - bundle sync kartinda satir bazli `X fark / alan listesi` gosterimi eklendi
- `npm.cmd run build` ile tekrar dogrulanmali

## Nisan 2026 - Cephe Pafta + Kot Overlay + Zincir Hover Derinlestirme

- Serbest cizimde aktif zincir mantigi buyutuldu:
  - duvarin ustune gelince ilgili chain highlight oluyor
  - hosted acikliklar da ayni aktif chain vurgusunu aliyor
  - oda / duvar / HTML mekan cizelgesi / SVG oda listesi artik daha senkron hover davraniyor
- Kanvasa yeni `kot overlay` eklendi:
  - aktif oda icin `+0.00`
  - tavan kotu (`+2.80 / +3.00 / +3.20`)
  isaretleniyor
- `FreeDrawCanvas` icinde secili duvar toolbar'ina `Cephe Pafta` butonu eklendi.
  - secili duvarin hosted acikliklarini kullanarak ayri teknik cephe paftasi uretiyor
- yeni dosya:
  - `src/components/freeDraw/freeDrawFacadePrint.ts`
  - secili duvar icin:
    - cephe gorunusu
    - toplam boy olculeri
    - aciklik segment olculeri
    - aciklik cizelgesi
    - revizyon blogu
    - teknik cephe HTML ciktiyor
- `freeDrawPrint.ts` tekrar buyutuldu:
  - `Kot Cizelgesi` eklendi
  - mekan bazli doseme ve tavan kotlari listeleniyor
- `styles.css` buyutuldu:
  - aktif chain hosted opening vurgulari
  - kot line / text stilleri
- `npm.cmd run build` temiz gecti

## Nisan 2026 - Endpoint Merge Geometri + Zincir Olcu + Teknik Uretim Aktarimi

- `FreeDrawCanvas` buyutuldu:
  - yeni `getWallEndpointMerges` yardimcisi ile duvar endpoint birlesimleri ayri hesaplanmaya baslandi
  - `renderWallEndpointMergePatch` ile kose/uc noktalarda daha fiziksel trim-merge hissi veren patch geometri eklendi
  - bu patch'ler mevcut merkez join patch'lere ek olarak calisiyor
- aktif oda/zincir icin yeni `segment chain` olculeri eklendi:
  - `S1 / S2 / ...`
  - her duvar segmentinin boyu aktif odanin disina teknik olcu zinciri gibi yaziliyor
- aktif oda icin `kot overlay` buyutuldu:
  - +0.00
  - tavan kotu
  artik daha belirgin teknik eleman olarak gorunuyor
- hosted acikliklarin hover davranisi guclendirildi:
  - aciklik uzerine gelince ilgili duvar chain'i aktif oluyor
- yeni dosya:
  - `src/components/freeDraw/freeDrawFacadePrint.ts`
  - secili duvarin hosted acikliklarindan ayri teknik `Cephe Pafta` HTML'i uretiyor
  - cephe gorunusu
  - aciklik segment olculeri
  - aciklik cizelgesi
  - revizyon blogu
  ciktiyor
- secili duvar toolbar'ina `Cephe Pafta` butonu eklendi
- `App.tsx` buyutuldu:
  - serbest cizimden gelen duvar cephesi artik `technical` gorunume aktariliyor
  - otomatik referans guide'lar uretiliyor
  - musteri/not alanlari duvar tipi ve oda bilgisiyle dolduruluyor
  - facade import daha cok uretim gorunusu gibi aciliyor
- `freeDrawPrint.ts` tekrar guclendirildi:
  - plan SVG aks mesafe etiketleri eklendi
  - baski paftasi daha teknik olcu dili kazandi
- `npm.cmd run build` temiz gecti

## Nisan 2026 - Rahat Cizim Paketi 02

- `Designer` ve `FreeDraw` arasinda guide paylasimi gorunur hale geldi:
  - `App.tsx` icinde `design.guides` artik `FreeDrawCanvas` a geciliyor
  - `freeDrawSnap.ts` icindeki harici guide snap mantigi korunarak `FreeDrawCanvas` icinde fiziksel guide overlay cizgileri eklendi
  - designer guide'lari FreeDraw tarafinda hem snap adayi hem de gorunur referans cizgisi olarak kullaniliyor
  - snap etiketi `GUIDE` yerine dogrudan guide label gosteriyor
- `DimensionText` daha rahat kullanilir hale getirildi:
  - `src/App.tsx` icindeki `DimensionText` artik gorunmez ama buyuk bir hit-area ile render ediliyor
  - panel ve satir olcusu uzerine tiklamak daha kolay
  - `openInlineDimensionEditor` `SVGElement` seviyesinde calisacak sekilde genellestirildi
- secili panel / kanat / cam icin dogrudan kenardan resize baslatma eklendi:
  - secili manipulator bounds uzerinde sag kenar ve alt kenar boyunca genis resize zone'lari var
  - sadece kucuk daire handle'lara nişan almak gerekmiyor
  - ayni drag mantigi kullaniliyor (`object-width`, `object-height`)
- stil iyilestirmeleri:
  - `editable-dimension-hit-area`
  - `object-resize-zone`
  - `free-draw-designer-guides`
  siniflari eklendi
  - hover, cursor ve guide overlay dili daha rahat cizim hissi veriyor
- `npm.cmd run build` tekrar temiz gecti
- halen yalnizca Vite `500 kB` chunk uyarisi var; hata degil
