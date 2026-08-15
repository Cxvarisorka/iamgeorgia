import type { LocalisedContent } from "./merge";
import type { TransferLocation } from "@/types";

/**
 * Pick-up and drop-off points, in each language.
 *
 * Only `name` and `region` are here. Coordinates, ids, types and images are
 * language-independent and stay in `data/transferLocations.ts`.
 *
 * Hotel names are left in Latin script throughout: they are the trading names
 * of real properties, and a traveller standing in an arrivals hall needs the
 * name that is written on the building.
 */
export const transferLocationContent: LocalisedContent<TransferLocation> = {
  ka: {
    "tbs-airport": {
      name: "თბილისის საერთაშორისო აეროპორტი",
      region: "თბილისი",
    },
    "bus-airport": {
      name: "ბათუმის საერთაშორისო აეროპორტი",
      region: "ბათუმი, აჭარა",
    },
    "kut-airport": {
      name: "ქუთაისის საერთაშორისო აეროპორტი",
      region: "ქუთაისი, იმერეთი",
    },
    tbilisi: { name: "თბილისი", region: "ქალაქის ცენტრი" },
    batumi: { name: "ბათუმი", region: "აჭარა · შავი ზღვის სანაპირო" },
    kutaisi: { name: "ქუთაისი", region: "იმერეთი" },
    gudauri: { name: "გუდაური", region: "სამთოთხილამურო კურორტი · კავკასიონი" },
    borjomi: { name: "ბორჯომი", region: "სამცხე-ჯავახეთი" },
    stepantsminda: { name: "სტეფანწმინდა (ყაზბეგი)", region: "მცხეთა-მთიანეთი" },
    mtskheta: { name: "მცხეთა", region: "მცხეთა-მთიანეთი" },
    sighnaghi: { name: "სიღნაღი", region: "კახეთის ღვინის მხარე" },
    telavi: { name: "თელავი", region: "კახეთის ღვინის მხარე" },
    mestia: { name: "მესტია", region: "სვანეთი" },
    "hotel-vera-house": { region: "ყიაჩელის ქუჩა 18, ვერა, თბილისი" },
    "hotel-gudauri-lodge": { region: "გუდაურის საბაგიროს ქვედა სადგური" },
    "hotel-batumi-seafront": { region: "ბათუმის ბულვარი, აჭარა" },
    "jvari-monastery": { name: "ჯვრის მონასტერი", region: "მცხეთის თავზე" },
    ananuri: { name: "ანანურის ციხე", region: "საქართველოს სამხედრო გზა" },
    uplistsikhe: { name: "უფლისციხე", region: "გორის მახლობლად, შიდა ქართლი" },
  },

  ru: {
    "tbs-airport": {
      name: "Международный аэропорт Тбилиси",
      region: "Тбилиси",
    },
    "bus-airport": {
      name: "Международный аэропорт Батуми",
      region: "Батуми, Аджария",
    },
    "kut-airport": {
      name: "Международный аэропорт Кутаиси",
      region: "Кутаиси, Имеретия",
    },
    tbilisi: { name: "Тбилиси", region: "Центр города" },
    batumi: { name: "Батуми", region: "Аджария · побережье Чёрного моря" },
    kutaisi: { name: "Кутаиси", region: "Имеретия" },
    gudauri: { name: "Гудаури", region: "Горнолыжный курорт · Большой Кавказ" },
    borjomi: { name: "Боржоми", region: "Самцхе-Джавахети" },
    stepantsminda: { name: "Степанцминда (Казбеги)", region: "Мцхета-Мтианети" },
    mtskheta: { name: "Мцхета", region: "Мцхета-Мтианети" },
    sighnaghi: { name: "Сигнахи", region: "Винный край Кахетии" },
    telavi: { name: "Телави", region: "Винный край Кахетии" },
    mestia: { name: "Местиа", region: "Сванетия" },
    "hotel-vera-house": { region: "ул. Киачели, 18, Вера, Тбилиси" },
    "hotel-gudauri-lodge": { region: "Нижняя станция канатной дороги Гудаури" },
    "hotel-batumi-seafront": { region: "Батумский бульвар, Аджария" },
    "jvari-monastery": { name: "Монастырь Джвари", region: "Над Мцхетой" },
    ananuri: { name: "Крепость Ананури", region: "Военно-Грузинская дорога" },
    uplistsikhe: { name: "Пещерный город Уплисцихе", region: "Рядом с Гори, Шида-Картли" },
  },

  he: {
    "tbs-airport": {
      name: "נמל התעופה הבינלאומי טביליסי",
      region: "טביליסי",
    },
    "bus-airport": {
      name: "נמל התעופה הבינלאומי בטומי",
      region: "בטומי, אדג'ריה",
    },
    "kut-airport": {
      name: "נמל התעופה הבינלאומי קותאיסי",
      region: "קותאיסי, אימרתי",
    },
    tbilisi: { name: "טביליסי", region: "מרכז העיר" },
    batumi: { name: "בטומי", region: "אדג'ריה · חוף הים השחור" },
    kutaisi: { name: "קותאיסי", region: "אימרתי" },
    gudauri: { name: "גודאורי", region: "אתר סקי · הקווקז הגדול" },
    borjomi: { name: "בורז'ומי", region: "סמצחה-ג'אוואחתי" },
    stepantsminda: { name: "סטפנצמינדה (קזבגי)", region: "מצחתה-מתיאנתי" },
    mtskheta: { name: "מצחתה", region: "מצחתה-מתיאנתי" },
    sighnaghi: { name: "סיגנאגי", region: "ארץ היין של קחתי" },
    telavi: { name: "טלאבי", region: "ארץ היין של קחתי" },
    mestia: { name: "מסטיה", region: "סוונטי" },
    "hotel-vera-house": { region: "רחוב קיאצ'לי 18, ורה, טביליסי" },
    "hotel-gudauri-lodge": { region: "תחנת הרכבל התחתונה בגודאורי" },
    "hotel-batumi-seafront": { region: "שדרות בטומי, אדג'ריה" },
    "jvari-monastery": { name: "מנזר ג'וורי", region: "מעל מצחתה" },
    ananuri: { name: "מבצר אנאנורי", region: "הכביש הצבאי הגאורגי" },
    uplistsikhe: { name: "עיר המערות אופליסציחה", region: "ליד גורי, שידה קרתלי" },
  },
};
