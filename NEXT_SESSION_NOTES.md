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
- teknik pafta profesyonellesti
  - title block icine revizyon / durum / kontrol alani eklendi
  - teknik bilgi panosuna uretim ozeti satirlari eklendi
  - detay levhasi buyutuldu
  - detay levhasina kesim ozeti / kontrol / revizyon bilgisi baglandi
- `npm.cmd run build` temiz geciyor

## Siradaki En Dogru Buyuk Adimlar

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
