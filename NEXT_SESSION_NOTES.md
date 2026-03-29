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
- donanim katmani
  - kol isaretleri
  - mentese pozisyonlari
  - kilit isaretleri
  - surme rayi ve tilt sembolu

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

- Preview'lu CAD komutlari eklendi
- Komut yazarken copy / mirror / array / offset icin hayalet sonuc gorunuyor
- Donanim katmani cizime baglandi; kol, mentese, kilit ve ray isaretleri gorunuyor
- Secili kanat ustunde donanim kalite secimi de artik dogrudan kanvasta yapilabiliyor

## Siradaki En Dogru Buyuk Adimlar

### 1. Daha derin katman sistemi

- not katmanina teknik aciklama / referans numarasi / musteri notu overlay'i
- donanim katmanina kol, mentese ve kilit pozisyonu isaretleri
- profil katmanina ic-dis hat ve detay cizgileri

### 2. Daha gercek CAD komutlari

- `copy` icin cizim ustunde hedef noktali placement
- `mirror` icin eksen secimi
- `array` icin satir/kolon dizisi
- `offset` icin referans dogru secimi

### 3. Obje bazli daha akilli manipulatorler

- secili kanat icin kol yonu / acilim overlay'i
- secili kayit icin referans eksenine gore hizali offset manipulatoru

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
