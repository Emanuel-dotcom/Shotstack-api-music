# Idei de produse AI pentru clinici dentare din România
### Cercetare internațională (SUA, UK, Germania) — iulie 2026

## De ce merită piața din România

- România are **~17.400 de cabinete stomatologice private** (doar ~31 publice), dintre care 85% în orașe; Bucureștiul singur are ~3.200.
- Piața a depășit **5,29 miliarde lei venituri nete în 2023** și crește constant; statul decontează doar ~6% din cheltuieli, deci clinicile sunt afaceri private care plătesc singure pentru software.
- România este destinație de **turism dentar** (pacienți din UK, Germania, Italia, Franța) — clinicile astea au nevoie de comunicare multilingvă, exact ce face AI-ul bine.
- Concurența locală (iStoma, DentManager, dROOT, Dentuno, AtriumApp) e software clasic de gestiune: programări, fișe, facturi. **Aproape nimeni nu vinde AI adevărat** — doar Vastoma face programări prin WhatsApp. Golul dintre ce există în SUA și ce există în România e fereastra ta.

## Ce se vinde deja afară (și cu ce bani)

În SUA piața e matură: recepționer vocal AI (Arini, Zaha AI, Dentra, TensorLinks — **$300–800/lună**, plus setup $500–3.500), verificare asigurări (Overjet, dentalrobot), imagistică AI cu aviz FDA (Pearl, Overjet, VideaHealth, Diagnocat, CranioCatch), comunicare pacienți (Weave, Yapi, Adit). Cifrele care vând: **34–45% reducere no-show în 60 de zile**, payback median **47 de zile**, ROI anual median **6,8x**, ~38% din apeluri pierdute fără AI.

Concluzia: modelele de business sunt validate afară la prețuri de 10x ce suportă piața românească — tu le replici la **500–2.000 lei/lună** și tot ai marjă excelentă, pentru că le construiești cu Claude, nu cu echipe de 50 de oameni.

---

## Ideile, ordonate după raport efort/bani

### 1. Recepționer AI pe WhatsApp + telefon (cel mai vandabil)
**Modelul copiat:** Arini, Zaha AI, Dentra (SUA).
**Ce faci:** un agent Claude conectat la WhatsApp Business API (+ opțional voce prin Twilio/Vonage) care răspunde 24/7 în română, engleză, germană, italiană: programează, reprogramează, răspunde la „cât costă un implant?", triază urgențele („mi-a căzut coroana" ≠ control de rutină), trimite confirmări și instrucțiuni pre/post-tratament.
**De ce WhatsApp și nu telefon întâi:** românii folosesc masiv WhatsApp, iar vocea în română e mai greu de făcut impecabil — începe cu text, adaugă voce ca upsell.
**Integrare:** calendar Google/Outlook la început; ulterior API sau export către iStoma/dROOT.
**Preț:** 500–1.500 lei/lună/clinică. Argumentul de vânzare: „un apel pierdut = un implant pierdut = 3.000–8.000 lei".

### 2. Sistem anti-no-show cu reamintiri inteligente
**Modelul copiat:** Weave, Adit, DoctorConnect.
**Ce faci:** automatizare (n8n/Make + Claude) care trimite reamintiri personalizate pe WhatsApp/SMS, cere confirmare, iar dacă pacientul anulează, **umple automat locul** din lista de așteptare. Claude scrie mesajele natural, adaptat pacientului (copil, senior, pacient de implant).
**Cifra care vinde:** reducere no-show 34–45%. La 20 no-show-uri/lună × 300 lei/ședință medie = 6.000 lei recuperați lunar.
**Preț:** 300–800 lei/lună. Ăsta e produsul de intrare — ieftin, ROI evident, se vinde din prima întâlnire.

### 3. Reactivare pacienți inactivi (recall)
**Modelul copiat:** modulele de recall din Yapi/Adit.
**Ce faci:** iei baza de pacienți a clinicii (export CSV din orice soft), Claude identifică cine n-a mai venit de 6+ luni la igienizare, cine are plan de tratament neterminat, și generează campanii WhatsApp/SMS/email personalizate.
**De ce e ușor de vândut:** poți face un **pilot pe bază de comision** — „vă reactivez pacienții, plătiți doar pentru cei care revin". Zero risc pentru clinică, cash imediat pentru tine.
**Preț:** 200–500 lei/campanie sau 10% din valoarea programărilor generate.

### 4. Asistent de note clinice și documente (dictare → fișă)
**Modelul copiat:** Pearl (ambient voice AI pentru note clinice), scribe-uri medicale AI.
**Ce faci:** medicul dictează pe telefon după consultație, Claude transcrie și structurează în fișa pacientului: diagnostic, tratament efectuat, recomandări, plus generează automat consimțământ informat, scrisoare medicală, plan de tratament în limbaj pe înțelesul pacientului. Româna e punctul forte — nimic din SUA nu face asta în română.
**Preț:** 200–400 lei/lună/medic.

### 5. Prezentare planuri de tratament + follow-up de vânzare
**Ce faci:** clinicile pierd enorm pe planuri de tratament acceptate parțial sau deloc. Claude transformă planul tehnic („extracție 3.6, implant, bont protetic, coroană zirconiu") într-un document frumos pentru pacient, cu explicații, etape, opțiuni de preț și rate — apoi automatizarea face follow-up politicos la 3, 7, 14 zile.
**Modelul copiat:** funcțiile de „treatment plan follow-up" din platformele americane de patient communication.
**Preț:** inclus ca modul premium peste #1/#2, sau 400–800 lei/lună.

### 6. Pachet turism dentar (nișă cu bani)
**Ce faci:** pentru clinicile care aduc pacienți din străinătate: agent AI care răspunde în engleză/germană/italiană/franceză, califică pacientul (cere radiografia, istoricul), generează oferta preliminară + itinerariu (tratament în 2 vizite, cazare, transfer), și ține pacientul „cald" până vine.
**De ce:** un pacient de turism dentar valorează 5.000–20.000 €. Clinicile astea plătesc fără să clipească 2.000–4.000 lei/lună pentru un sistem care le convertește lead-urile.

### 7. Recenzii și reputație Google
**Ce faci:** după fiecare vizită, mesaj automat care cere recenzie (cu filtrare: pacienții mulțumiți → Google, cei nemulțumiți → feedback privat către manager), plus Claude scrie răspunsuri la toate recenziile în tonul clinicii.
**Preț:** 150–300 lei/lună. Produs simplu, bun ca „picior în ușă".

### Ce să NU faci (deocamdată)
- **Diagnostic pe radiografii/CBCT** (gen Diagnocat, Pearl, Overjet) — e dispozitiv medical, cere marcaj CE/MDR în UE, ani de reglementare. Nu construi; eventual devino **reseller local** pentru Diagnocat/CranioCatch dacă vrei nișa asta.
- **Un soft complet de gestiune** care concurează iStoma — piață ocupată, ciclu lung. Tu vinzi stratul de AI **peste** ce au deja.

---

## Cum le construiești cu Claude

- **Stack recomandat:** Claude API (agenți pe claude-fable-5 pentru conversații, claude-haiku-4-5 pentru clasificări/volume mari) + n8n sau Make pentru automatizări + WhatsApp Business API (prin Meta direct sau 360dialog/Twilio) + Supabase/Postgres pentru date + un dashboard simplu (Next.js) pentru clinică.
- **GDPR e obligatoriu și e argument de vânzare:** datele pacienților sunt date medicale (categorie specială). Găzduire în UE, DPA semnat cu clinica, consimțământ în fluxuri. Spune-le clinicilor „conform GDPR, date în UE" — concurenții improvizați nu pot.
- **Nu vinde „AI", vinde rezultatul:** „vă umplem golurile din agendă", „nu mai pierdeți niciun apel", „pacienții inactivi se întorc". Dentiștii cumpără pacienți și timp, nu tehnologie.

## Plan de atac (primele 90 de zile)

1. **Săpt. 1–2:** construiește #2 (anti-no-show) + #7 (recenzii) — sunt cele mai simple; fă un demo pe date fictive.
2. **Săpt. 3–4:** găsește 2–3 clinici pilot (cunoștințe, clinici medii din orașul tău, 3–10 medici — destul de mari să doară problema, destul de mici să decidă repede). Oferă pilotul gratuit 30 de zile contra unui testimonial și studiu de caz cu cifre.
3. **Luna 2:** adaugă #1 (recepționer WhatsApp) și #3 (reactivare) la clinicile pilot; începe să facturezi.
4. **Luna 3:** cu studiile de caz („clinica X a recuperat 8.000 lei/lună din no-show-uri"), vinde direct: grupuri de Facebook ale medicilor stomatologi din RO, expoziții (Denta București — primăvară/toamnă), DM-uri către clinicile cu multe recenzii Google (semn că le pasă de marketing).
5. **Model de preț:** abonament lunar pe clinică, 3 pachete (Start ~500 lei / Pro ~1.200 lei / Turism dentar ~2.500 lei), fără contracte anuale la început — barieră mică de intrare.

Ținta realistă: **20 de clinici × 800 lei/lună medie = 16.000 lei/lună recurent** în 6–9 luni, dintr-o piață de 17.000+ cabinete în care aproape nimeni nu vinde așa ceva încă.

---

## Surse

- [ZF: România, țara cu 35 de cabinete publice și 17.000 private](https://www.zf.ro/companii/romania-tara-35-cabinete-stomatologice-publice-17-000-private-22638783)
- [ZF: România are peste 17.400 de cabinete stomatologice](https://www.zf.ro/companii/romania-peste-17-400-cabinete-stomatologice-dintre-85-oras-31-22882216)
- [Termene.ro: Afacerile stomatologice din România](https://termene.ro/articole/afacerile-stomatologice-din-romania)
- [ManagementPro: Piața serviciilor stomatologice 2014–2026](https://managementpro.ro/piata-serviciilor-stomatologice-in-romania-2014-2026-tendinte-provocari-oportunitati/)
- [Medix: How Dental Practices Can Use AI in 2026](https://medixdental.com/how-dental-practices-can-use-ai/) și [8 Best AI Tools for Dental Practices](https://medixdental.com/ai-tools-for-dental-practices/)
- [Orthia: Dental AI Receptionist Competition 2026](https://orthia.io/blog/dental-ai-receptionist-competition)
- [TensorLinks: Best AI Dental Receptionist 2026](https://www.tensorlinks.com/blog/best-ai-dental-receptionist-2026/)
- [DentalBase: AI Receptionist ROI Calculator](https://www.dentalbase.ai/blogs/practice-management/ai-dental-receptionist-roi-calculator-worth-it) și [Cost Breakdown 2026](https://www.dentalbase.ai/blogs/practice-management/dental-virtual-receptionist-cost-2026-breakdown)
- [Wavez: AI Receptionist 90-Day ROI Study](https://wavezautomation.online/resources/ai-receptionist-roi-study)
- [Diagnocat](https://diagnocat.com/en), [Pearl](https://hellopearl.com/), [CranioCatch](https://www.craniocatch.com/en/), [Adit](https://adit.com/), [dentalrobot](https://www.dentalrobot.ai/)
- [iStoma](https://istoma.ro/), [DentManager](https://www.dentmanager.ro/), [dROOT](https://droot.ro/), [Vastoma](https://vastoma.ro/), [AtriumApp](https://atriumapp.ro/)
