// Underlying conditions — IDs and labels copied from khanesh/src/conditions.js (mirror of server rules/conditions.js).
// Only IDs go to the server, in patient.conditions; what the engine actually applied comes back in
// _engine.context.conditions_applied. Icons are this app's own.
export const CONDITIONS = [
  { id: "htn", fa: "فشار خون بالا", icon: "pulse" },
  { id: "dm2", fa: "دیابت نوع ۲", icon: "water" },
  { id: "lipid", fa: "چربی خون بالا", icon: "flame" },
  { id: "hypothyroid", fa: "کم‌کاری تیروئید", icon: "thermometer" },
  { id: "ckd", fa: "بیماری مزمن کلیه", icon: "filter" },
  { id: "dialysis", fa: "دیالیز (همودیالیز یا صفاقی)", icon: "sync" },
  { id: "fatty_liver", fa: "کبد چرب", icon: "leaf" },
  { id: "ida", fa: "کم‌خونی فقر آهن", icon: "water-outline" },
  { id: "thal_trait", fa: "ناقل تالاسمی (مینور)", icon: "git-network" },
  { id: "chd", fa: "بیماری عروق قلب", icon: "heart" },
  { id: "cancer", fa: "سرطان / شیمی‌درمانی", icon: "ribbon" },
  { id: "hospitalized", fa: "بستری در بیمارستان (بخش، ICU یا اورژانس)", icon: "bed" },
] as const;

// What the profile asks. A condition picked before this list was narrowed still shows, so it can be seen and removed.
export const ASKED_CONDITIONS: string[] = ["htn", "dm2", "ckd", "dialysis", "thal_trait", "cancer", "hospitalized"];
