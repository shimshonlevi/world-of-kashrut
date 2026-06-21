# פריסה לענן — Vercel + Neon (Postgres)

המערכת הוכנה לפריסה: בסיס הנתונים הוא **PostgreSQL** (Neon), והקוד מותאם לסביבת ענן.
זמן משוער: ~15 דקות.

---

## שלב 1 — GitHub
ודא שהקוד עלה ל-GitHub (בראנץ' `dev` או `main`). Vercel מתחבר ישירות ל-repo.

## שלב 2 — בסיס נתונים ב-Neon (חינמי)
1. היכנס ל-https://neon.tech → הירשם → **New Project**.
2. בעמוד החיבור העתק את **Connection string** מסוג **Pooled connection**
   (נראה כך: `postgresql://user:pass@ep-xxx-pooler.../neondb?sslmode=require`).

## שלב 3 — העלאת הסכמה והנתונים ל-Neon (חד-פעמי)
במחשב, עם ה-connection string מ-Neon:
```bash
# .env מקומי:  DATABASE_URL="<ה-connection string מ-Neon>"
pnpm install
pnpm db:deploy      # יוצר את כל הטבלאות (db push) + מזריע נתוני דמו (seed)
```
> אפשר גם שאני אריץ את זה — פשוט שלח לי את ה-connection string.

## שלב 4 — פריסה ב-Vercel
1. היכנס ל-https://vercel.com → **Add New → Project** → ייבא את ה-repo מ-GitHub.
2. Framework: **Next.js** (מזוהה אוטומטית). אל תשנה את פקודות ה-build.
3. תחת **Environment Variables** הוסף:

| משתנה | ערך |
|--------|-----|
| `DATABASE_URL` | ה-connection string מ-Neon |
| `AUTH_SECRET` | מחרוזת אקראית ארוכה (`openssl rand -hex 32`) |
| `OPENAI_API_KEY` | מפתח OpenAI (לעוזר ה-AI) |
| `GOOGLE_CREDENTIALS_JSON` | *(אופציונלי)* כל קובץ ה-JSON של חשבון השירות, בשורה אחת |
| `GOOGLE_DRIVE_FOLDER_ID` | *(אופציונלי)* מזהה תיקיית Drive משותפת |

4. **Deploy**. בסיום מתקבלת כתובת חיה (למשל `world-of-kashrut.vercel.app`).

## שלב 5 — כניסה ראשונה
התחבר עם משתמש **מנהל** וסיסמה **`1234`** → היכנס להגדרות → משתמשים → **שנה את הסיסמה**.

---

## הערות חשובות
- **כל push ל-GitHub** מפעיל פריסה אוטומטית מחדש ב-Vercel.
- **העלאת קבצי מסמכים**: על Vercel אין דיסק קבוע, לכן קבצים שמועלים מקומית לא נשמרים לאורך זמן. הפתרון: **Google Drive עם Shared Drive** (אז ההעלאות נשמרות ב-Drive). עד אז ניתן לעבוד עם קישורי מסמכים.
- **דדליין/נתונים**: נתוני הדמו נוצרים ב-`seed`. למחיקתם והתחלה נקייה — הרץ `pnpm db:push` בלבד (בלי seed) על DB ריק.
- מעבר חזרה ל-SQLite מקומי לא נדרש — אפשר להשתמש ב-Neon גם לפיתוח.
