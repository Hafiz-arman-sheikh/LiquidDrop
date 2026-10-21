LiquidDrop 💧
LiquidDrop ek website hai jahan aap apni files upload aur save kar sakte hain. Aap account bana kar login karte hain, phir apni files dekh, download aur delete kar sakte hain.

Files Supabase par save hoti hain. Is liye page refresh karne ya baad mein dobara login karne par bhi saved files mil sakti hain. Iske liye neeche diya gaya Supabase setup pehle complete karna hoga.
Is website mein kya kya hai?
- Email aur password se account banana.
- Login aur logout.
- Ek ya kai files ek saath upload karna.
- Files ko drag karke upload area mein chhorna.
- Mobile ya computer se Choose Files button use karna.
- Jahan browser support kare, copied image paste karke upload karna.
- Upload ki halat dekhna: waiting, uploading, completed ya failed.
- Failed upload ko Retry karna.
- File ke naam se search karna.
- Images, PDFs, audio, videos aur doosri files alag dekhna.
- Files ko date, naam ya size ke hisaab se lagana.
- Grid aur list mein files dekhna.
- Browser support kare to image, PDF, audio aur video ka preview dekhna.
- Files download aur delete karna.
- Saved files ki ginti aur total size dekhna.
- Light aur dark mode.
Kin cheezon se banaya hai?
Cheez	Iska kaam
HTML	Page par buttons, forms aur sections banata hai.
CSS	Rang, design, mobile layout aur animations lagata hai.
JavaScript	Buttons aur website ke functions chalata hai.
Supabase Auth	Signup aur login sambhalta hai.
Supabase Storage	Asli files save karta hai.
Supabase Database	File ka naam, size, path aur owner ki details save karta hai.


React, TypeScript ya build command ki zaroorat nahi hai.
Files ka folder
Sab files ek hi folder mein rakhein:
LiquidDrop/
├── index.html
├── styles.css
├── supabase-config.js
├── auth.js
├── app.js
├── setup.sql
└── README.md
Kaunsi file kya karti hai?
File	Aasaan matlab
index.html	Website ka page hai.
styles.css	Website ko design deti hai.
supabase-config.js	Website ko aapke Supabase project se jorti hai.
auth.js	Signup, login, logout aur login ki halat sambhalti hai.
app.js	Upload, file list, search, preview, download aur delete chalati hai.
setup.sql	Supabase mein table, bucket aur access ke rules banati hai.
README.md	Yeh guide hai.


Website kaise chalani hai?
1. Supabase project banayein
1. Supabase par login karein.
2. New project par click karein.
3. Project ka naam aur database password set karein.
4. Project tayyar hone ka intezar karein.
Database password website ki kisi file mein paste nahi karna.
2. Project URL aur API key lein
Project ke Connect ya Settings → API Keys wale hisse mein dekhein. Dashboard mein naam thora alag bhi ho sakta hai.

Aapko do cheezein chahiye:
- Project URL — aam tor par https://your-project.supabase.co jaisa hota hai.
- Publishable key — frontend mein use hone wali key. Purani anon key bhi use ho sakti hai.
Secret key, service-role key ya database password browser code mein nahi lagana.
3. Dono values config file mein lagayein
supabase-config.js kholein. Ismein yeh lines milengi:
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY';
- YOUR_SUPABASE_PROJECT_URL ki jagah apna Project URL paste karein.
- YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY ki jagah publishable ya anon key paste karein.
- Dono taraf ke quotes rehne dein.
- File save kar dein.
4. SQL code run karein
1. Supabase mein SQL Editor kholein.
2. New query par click karein.
3. setup.sql ka poora code copy karke paste karein.
4. Run par click karein.
Isse files table, private bucket aur access ke rules banenge. Access ke rules ka matlab hai ke har account ko apni files tak ijazat mile.

Yeh setup naye project ke liye use karein. Agar pehle se files naam ki koi doosri table ya sabko access dene wali policies hain, to unhein pehle check karna hoga.
5. Storage bucket check karein
Supabase ke Storage section mein yeh bucket honi chahiye:
liquiddrop-files
Iska Public option OFF hona chahiye. Bucket ka naam code mein bhi yahi hai. SQL is bucket ko banata hai; aam tor par alag se banane ki zaroorat nahi.
6. Email aur password wala login on karein
Authentication mein Email provider ya Sign In settings kholein. Email/password login enabled hona chahiye.

Agar Confirm email ON hai, to account banane ke baad email mein aane wala link kholna hoga. Default confirmation email template rehne dein.
7. Login ke baad wapas aane wala address set karein
Authentication → URL Configuration mein Site URL ke liye yeh local address use kar sakte hain:
http://127.0.0.1:5500/index.html
Redirect URLs mein yeh dono addresses add karein:
http://127.0.0.1:5500/index.html
http://localhost:5500/index.html
Apne browser ka actual address zaroor dekhein. Agar port doosra hai ya address mein /LiquidDrop/index.html aa raha hai, to wohi poora address add karein. localhost aur 127.0.0.1 alag hosts hain.
8. VS Code se website kholein
1. VS Code mein poora LiquidDrop folder open karein.
2. Live Server extension install karein.
3. index.html par right-click karein.
4. Open with Live Server par click karein.
HTML file ko double-click karke file:// se na chalayein. JavaScript ki module files ke liye Live Server use karein. Supabase SDK load karne ke liye internet bhi chahiye.
9. Account banayein
Website par Sign up select karein. Email aur password likh kar account banayein.

Password kam az kam 8 characters ka ho; Supabase mein aapne zyada sakht password rule rakha ho to woh bhi poora karein.

Email confirmation on ho to inbox aur spam folder check karein. Confirmation link kholne ke baad zaroorat ho to Log in karein.
10. Ek file upload karein
Choose Files par click karke chhoti file select karein. Upload khud shuru ho jayegi. Computer par file ko upload area mein drag karke bhi chhor sakte hain.

Upload ke baad Supabase mein dono jagah check karein:
- Storage → liquiddrop-files: asli file milni chahiye, user ID aur upload ID ke folders ke andar.
- Table Editor → files: us file ki details ki row milni chahiye.
11. Refresh karke dekhein
Page refresh karein. File dobara list mein aani chahiye. Files sirf browser mein temporary save nahi hotin; woh Supabase par hoti hain.
12. Logout aur login karke dekhein
Logout karein. File list clear honi chahiye. Usi account se dobara login karein. Saved files wapas aani chahiye.
13. Doosre account se check karein
Doosre email se account banayein. Iske liye doosra browser profile ya incognito window use kar sakte hain.

Pehle account ki files doosre account ko nazar nahi aani chahiye. Sirf list check karna poora security test nahi: doosre account se pehle account ki file ka direct download aur database access bhi block hona chahiye. Yeh test logged-in user ke taur par karein; SQL Editor admin ko zyada access hota hai.
14. Website online lagane ke baad
Supabase ki URL Configuration mein Site URL ko apne live HTTPS address se replace karein. Live index.html ka poora address Redirect URLs mein bhi add karein.
Files aapas mein kaise juri hain?
index.html ke <head> mein yeh CSS link pehle se hai:
<link rel="stylesheet" href="./styles.css">
Iska matlab hai: isi folder se styles.css load karo.

Usi <head> mein yeh JavaScript line bhi hai:
<script type="module" src="./app.js"></script>
type="module" is liye hai kyun ke JavaScript files ek doosre se functions import karti hain.
- app.js, auth.js se login wale functions leti hai.
- auth.js user badalne ki khabar app.js ko deti hai.
- app.js aur auth.js dono supabase-config.js se Supabase connection leti hain.
- ./ ka matlab hai isi folder mein.
- Filenames aur capital/small letters same rakhein.
- auth.js ya supabase-config.js ka alag script tag lagane ki zaroorat nahi.
- setup.sql ka HTML se link nahi hota. Woh sirf SQL Editor mein run hoti hai.
File size ki limit
Ek file ki limit 20 MiB, yani 20,971,520 bytes hai. Unlimited storage ka wada nahi hai. Supabase project ki storage aur doosri limits bhi apply hoti hain.

Limit badalni ho to teen jagah change chahiye:
1. supabase-config.js ka MAX_FILE_BYTES.
2. Database mein size_bytes ki limit wala rule.
3. Storage bucket ka file_size_limit.
Project ki global file limit bhi check karein. Purani table ki limit sirf setup.sql dobara run karne se change nahi hoti; us rule ko alag SQL se update karna hota hai.
Upload ke waqt yeh baatein yaad rakhein
- Upload poori hone tak tab khula rakhein.
- Spinner ka matlab upload chal rahi hai. Banawati percentage show nahi hoti.
- Same naam ki files alag unique paths mein save hoti hain; purani file overwrite nahi hoti.
- Failed upload par Retry karein.
- Queue temporary memory mein hoti hai. Refresh ke baad failed file dobara choose karni hogi.
- File pehle Storage mein jaati hai, phir uski details database mein save hoti hain.
- Details save na hon to code uploaded file saaf karne ki koshish karta hai.
- Internet band hone, tab band hone ya late response ki wajah se kabhi file aur uski details mein farq reh sakta hai. Aisi surat mein Storage aur table ko compare karke safai karni pad sakti hai.
- Delete ke waqt pehle asli file aur phir database row remove hoti hai. Adhoora delete ho to success samajhne ke bajaye error padhein aur Delete dobara try karein.
Preview aur download
Supported images, PDFs, audio aur videos ka preview browser ke andar mil sakta hai. Har browser har media format nahi chala sakta.

HTML aur SVG ka preview nahi chalaya jata; unke liye download option hai. PDF blank aaye ya media na chale to Download file use karein.

Preview ke liye browser mein temporary link banta hai. Preview band hone par woh release hota hai. Download ke liye bana temporary link 60 seconds baad release hota hai.
Dark mode aur saved login
Theme ki choice localStorage mein save ho sakti hai. Supabase SDK login session bhi browser storage mein sambhalta hai, taake refresh par login reh sake.

Asli file contents localStorage mein save nahi hote. Woh Supabase Storage mein hain, aur unki details database mein hain.
Agar koi masla aaye
Masla	Pehle kya check karein?
Invalid URL ya API key	Config mein dono placeholders replace hue hain? URL aur key ek hi project ki hain? Quotes theek hain?
Bucket not found	setup.sql run hui? Bucket ka naam exactly liquiddrop-files hai?
RLS permission error	Login hain? SQL rules aur permissions ban gaye? File path user ke apne folder se shuru hota hai?
Confirmation email nahi aayi	Inbox, spam aur Supabase ki email settings check karein. Mail delivery ke liye SMTP setup ki zaroorat ho sakti hai.
Confirmation link expire hai	Naya confirmation email bhejein aur naya link use karein.
Email link galat page kholta hai	Site URL, Redirect URLs, port aur poora page path check karein.
Files load nahi hotin	Internet aur login check karein. Refresh ya Try again dabayein. Database SELECT rule bhi check karein.
JavaScript module error	Live Server use karein. File names, ./ paths aur CDN internet access check karein.
File size error	File 20 MiB se bari to nahi? Database, bucket, project limit aur remaining storage check karein.
Preview nahi chal raha	Browser format support nahi karta ho sakta hai. Download karke suitable app mein kholein.


Aakhri baar yeh checks kar lein
- [ ] Account ban raha hai aur login ho raha hai.
- [ ] Email confirmation kaam kar rahi hai, agar on hai.
- [ ] Ek aur multiple files upload ho rahi hain.
- [ ] Storage mein file aur database mein row dono aa rahe hain.
- [ ] Refresh aur dobara login ke baad files mil rahi hain.
- [ ] Search, filter, sorting aur grid/list chal rahe hain.
- [ ] Preview aur downloaded file theek hain.
- [ ] Delete cancel, confirm aur retry kaam kar rahe hain.
- [ ] Doosra account pehle account ki files access nahi kar sakta.
- [ ] Mobile layout, keyboard focus aur dark mode check kar liya hai.
- [ ] Limit se bari file reject ho rahi hai.
Abhi kya test hua hai?
JavaScript syntax aur HTML ke element names check kiye gaye hain. Asli Supabase ki jagah test wala connection aur page elements use karke uploads, retry, failed metadata ki cleanup, search, delete failure/retry, safe filename display aur logout par list clear hona check hua hai.

Asli Supabase project mein SQL, email delivery, access ke rules aur files ka save rehna aapko verify karna hoga. Real browser visual test nahi ho saka kyun ke test environment mein browser available nahi tha aur download fail hua. Mobile design, previews aur actual downloads apne browser mein bhi check karein.
Supabase ki madad wali links
- Storage access rules
- File size limits
- Authentication redirect URLs
- API keys