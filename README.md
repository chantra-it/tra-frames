# Tra Frames — Next-Generation Photo Frame Platform
> វេទិកាស៊ុមរូបថតយុទ្ធនាការ និងព្រឹត្តិការណ៍ទំនើបបំផុត (Modern 2026 UI Frame Platform)

---

## 🌟 អំពីគម្រោង (About The Project)

**Tra Frames** គឺជា Web Application ពេញលេញ និងទំនើបដែលបានបង្កើតឡើងជាវេទិកាស៊ុមរូបថតយុទ្ធនាការជំនាន់ថ្មី។ វាអនុញ្ញាតឱ្យអ្នកប្រើប្រាស់៖
1. **រុករកយុទ្ធនាការ (Explore Campaigns)**៖ ស្វែងរកយុទ្ធនាការតាមប្រភេទដូចជា ការអប់រំ (Education), វប្បធម៌/បុណ្យជាតិ (Culture), សប្បុរសធម៌ (Charity), បច្ចេកវិទ្យា (Tech), និងពិធីជប់លៀង (Celebrations)។
2. **បន្ទប់កែរូបថត Canvas Studio (Interactive Studio)**៖
   - អូសរូបរៀបចំទីតាំង (Drag & Pan with mouse/touch)
   - ពង្រីក/បង្រួម (Zoom In/Out slider, mouse wheel, pinch gesture)
   - បង្វិលរូប 360° និងប៊ូតុងបង្វិល 90°
   - ត្រឡប់រូបឆ្វេងស្តាំ (Flip Horizontal) និងលើក្រោម (Flip Vertical)
   - កែសម្រួលពណ៌រូបភាព (Brightness, Contrast, Saturation)
   - ទាញយករូបភាពកម្រិតច្បាស់ខ្ពស់ (High Definition 1080x1080 HD Export) គ្មាន watermark
   - ចលនាធ្លាក់ផ្កា/ក្រដាសពណ៌ (Confetti Celebration) ពេល Download ជោគជ័យ
   - ប៊ូតុងចម្លង Caption និងចែករំលែកទៅកាន់ Telegram, Facebook, X (Twitter)
3. **បង្កើតយុទ្ធនាការផ្ទាល់ខ្លួន (Campaign Creator)**៖
   - បង្ហោះស៊ុមរូបភាពផ្ទាល់ខ្លួន (Transparent PNG)
   - បង្កើត Link ផ្ទាល់ខ្លួន (Custom Slug)
   - កំណត់ចំណងជើង, ការពិពណ៌នា, ប្រភេទ និង Caption
4. **ឧបករណ៍រចនាស៊ុមក្នុង App (In-App Frame Designer)**៖
   - សម្រាប់អ្នកដែលមិនសូវចេះ Photoshop ឬ Canva អាចរចនាស៊ុម Twibbon ដ៏ស្អាតបានក្នុងរយៈពេលតែប៉ុន្មានវិនាទី
   - ជ្រើសរើសរាងកាត់ (Circle, Rounded Square, Square, Arch, Octagon)
   - ជ្រើសរើសពណ៌ Gradient និង Theme (Royal Blue, Emerald, Crimson Red, Sunset, Midnight Gold, Cyber Neon, Rose Pink)
   - កំណត់អក្សរ Badge និង Ribbon
   - នាំចេញជា PNG ថ្លា ឬយកទៅបង្កើតយុទ្ធនាការភ្លាមៗ
5. **UI/UX ទំនើប ឆ្នាំ 2026**៖
   - Dark Mode / Light Mode
   - ភាសាខ្មែរ (Khmer) & អង់គ្លេស (English)
   - រចនាប័ទ្ម Glassmorphism ជាមួយ Glow effects
   - ដំណើរការល្អលើទូរស័ព្ទដៃ និងកុំព្យូទ័រ

---

## 🚀 របៀបបើកដំណើរការ (How to Run)

### វិធីទី ១ (ងាយស្រួលបំផុត 1-Click Launcher លើ Windows)
* គ្រាន់តែ Double-click លើឯកសារ `run_app.bat` វានឹងបើក Local Server និង Browser ជូនលោកអ្នកដោយស្វ័យប្រវត្តិ។

### វិធីទី ២ (បើកផ្ទាល់លើ Web Browser)
* Double-click លើឯកសារ `index.html` ដើម្បីបើកលើ Chrome, Edge, Safari ឬ Firefox ជាការស្រេច។

### វិធីទី ៣ (ដំណើរការតាមរយៈ PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```
បន្ទាប់មកបើក Browser ទៅកាន់ `http://localhost:8080/`។

---

## 📂 រចនាសម្ព័ន្ធឯកសារ (Project Structure)

```
Create by Ai/
├── index.html              # ទំព័រមេ SPA (Single Page Application)
├── run_app.bat             # ឯកសារចុចបើកកម្មវិធី 1-Click Launcher សម្រាប់ Windows
├── serve.ps1               # PowerShell .NET HTTP Server
├── css/
│   └── styles.css          # រចនាប័ទ្ម Modern Glassmorphism & UI System
├── js/
│   ├── app.js              # Application Controller & Router
│   ├── canvas-studio.js    # HTML5 Canvas Engine (Drag, Zoom, Rotate, Filters, HD Export)
│   ├── campaign-data.js    # ទិន្នន័យយុទ្ធនាការគំរូ និង LocalStorage Service
│   ├── frame-designer.js   # ឧបករណ៍រចនាស៊ុម Twibbon ក្នុង App
│   ├── i18n.js             # វចនានុក្រមភាសាខ្មែរ និងអង់គ្លេស
│   └── icons.js            # SVG Icons ទំនើប
└── README.md               # ឯកសារណែនាំ
```

---

## 💡 គន្លឹះក្នុងការប្រើប្រាស់ (Tips)
* **តេស្តសាកល្បងភ្លាមៗ**៖ ក្នុងទំព័រយុទ្ធនាការនីមួយៗ មាន **Sample Avatars** (រូបតំណាងគំរូ ៣ ផ្សេងគ្នា) ដែលលោកអ្នកអាចចុចតេស្តសាកល្បងបានភ្លាមដោយមិនចាំបាច់ស្វែងរករូបថតពីកុំព្យូទ័រឡើយ។
* **ប្តូរភាសា & Theme**៖ ចុចប៊ូតុង `ខ្មែរ / EN` ឬប៊ូតុង `ព្រះអាទិត្យ / ព្រះច័ន្ទ` នៅជ្រុងខាងស្ដាំផ្នែកខាងលើ។
