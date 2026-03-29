# PVC Designer

Electron + React + TypeScript ile baslatilmis masaustu PVC pencere ve kapi cizim uygulamasi.

## Teknoloji

- Electron
- React
- TypeScript
- Vite
- Zustand

## Ilk Hedef

- Dis cerceve olculeri girme
- Dikey ve yatay kayit ekleme
- Panel tipleri atama
- Olculu 2D cizim onizleme
- PDF ve gorsel export altyapisi

## Kurulum

Bu makinede su anda `node` ve `npm` komutlari kurulu degil ya da PATH icinde gorunmuyor.

Kurulumdan sonra:

```powershell
npm install
npm run dev
```

## Onerilen Node Surumu

- Node.js 22 LTS

## Klasor Yapisi

```text
electron/        Electron ana proses ve preload
src/             React arayuzu
src/data/        Ornek tasarim verileri
src/types/       PVC veri modelleri
```

## Sonraki Gelistirme Adimlari

1. Zustand store ile proje durum yonetimi
2. Surukle-birak bolme editoru
3. Panel secim ve ozellik duzenleme
4. Gercek olcu dagitim algoritmasi
5. PDF ve teknik cizim export
