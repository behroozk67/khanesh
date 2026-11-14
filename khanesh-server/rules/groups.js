// ============================================================
// گروه‌بندیِ بالینی و ترتیبِ متنِ تفسیر
//
// مشکلِ واقعی (گزارشِ اپ موبایل): متنِ تفسیر «چند جزیرهٔ جدا» بود — CRP در یک پاراگراف و ESR چهار پاراگراف
//   پایین‌تر، آهن و هموگلوبین جدا از هم، و ترتیبِ پاراگراف‌ها ترتیبِ فوریتِ یافته‌ها بود نه ترتیبِ برگه.
//   پرامپت قبلاً «پراکنده نگو» می‌گفت (قاعدهٔ ۹) و مدل رعایت نمی‌کرد؛ این فایل آن را از سمتِ کد تضمین می‌کند:
//
//   ۱. هر یافته دقیقاً یک گروهِ بالینی دارد (RULE_GROUP، جدولِ صریح؛ نگهبان: تستِ «هر قاعده یک گروه»).
//   ۲. مدل برای هر گروه یک بخش می‌نویسد (sections: [{group, text}])؛ کد بخش‌ها را به ترتیبِ ثابتِ گروه‌ها
//      می‌چیند: هماتولوژی ← بیوشیمی ← هورمون و ایمونولوژی ← ادرار و مدفوع. یک گروه = یک پاراگراف.
//   ۳. بخشِ گم‌شده یا شکلِ قدیمیِ پاسخ (فقط interpretation) ⇒ متنِ قطعیِ موتور (must_say) همان گروه.
//   ۴. تورهای ایمنیِ server.js (بازگرداندنِ جمله‌ی افتاده، عددِ کلیدی) به پاراگرافِ گروهِ خودِ یافته اضافه
//      می‌کنند، نه به ته‌ِ متن.
//
// ⚠️ این فایل هیچ حکمِ بالینی نمی‌سازد و متنِ must_say را عوض نمی‌کند؛ فقط می‌چیند. فوریت و has_critical دست‌نخورده‌اند.
// ============================================================

import { normalizeFa, splitSentences } from "./coverage.js";
import { faName } from "./names.js";

/**
 * گروه‌ها به ترتیبِ خروجی. `cues`: اگر جملهٔ اولِ پاراگراف هیچ‌کدام را نداشت، «عنوان: » جلویش می‌آید تا
 * جملهٔ اول همیشه گروه را نام ببرد. `general` عنوان ندارد (نکته‌های بین‌گروهی: واحدِ نامعلوم، یافتهٔ ناشناخته).
 */
export const INTERP_GROUPS = [
  // ── هماتولوژی ──
  { id: "marrow", fa: "شمارش سلول‌های خونی", cues: ["سلول‌های خونی", "شمارش"] },
  { id: "anemia", fa: "کم‌خونی و آهن", cues: ["کم‌خونی", "آهن"] },
  { id: "wbc", fa: "گلبول‌های سفید", cues: ["گلبول‌های سفید", "گلبول سفید"] },
  { id: "plt", fa: "پلاکت‌ها", cues: ["پلاکت"] },
  { id: "coag", fa: "انعقاد خون", cues: ["انعقاد", "لخته"] },
  { id: "inflam", fa: "التهاب", cues: ["التهاب"] },
  // ── بیوشیمی ──
  { id: "glucose", fa: "قند خون", cues: ["قند"] },
  { id: "lipid", fa: "چربی‌های خون", cues: ["چربی"] },
  { id: "kidney", fa: "کلیه", cues: ["کلیه"] },
  { id: "liver", fa: "کبد", cues: ["کبد"] },
  { id: "electrolyte", fa: "الکترولیت‌ها و اسید-باز", cues: ["الکترولیت", "اسید"] },
  { id: "mineral", fa: "کلسیم و مواد معدنی", cues: ["کلسیم", "مواد معدنی"] },
  { id: "cardiac", fa: "قلب و عضله", cues: ["قلب", "عضله"] },
  { id: "vitamin", fa: "ویتامین‌ها و عناصر کمیاب", cues: ["ویتامین", "عناصر کمیاب"] },
  // ── هورمون و ایمونولوژی ──
  { id: "thyroid", fa: "تیروئید", cues: ["تیروئید"] },
  { id: "adrenal", fa: "غدد هیپوفیز و فوق‌کلیه", cues: ["هیپوفیز", "فوق‌کلیه"] },
  { id: "repro", fa: "هورمون‌های جنسی و بارداری", cues: ["هورمون", "بارداری", "منی"] },
  { id: "immune", fa: "ایمنی و خودایمنی", cues: ["خودایمنی", "ایمنی"] },
  { id: "infect", fa: "عفونت و سرولوژی", cues: ["عفونت", "سرولوژی"] },
  { id: "tumor", fa: "نشانگرهای تومورال", cues: ["تومورال", "نشانگر"] },
  // ── ادرار و مدفوع ──
  { id: "urine", fa: "ادرار", cues: ["ادرار"] },
  { id: "stool", fa: "مدفوع", cues: ["مدفوع"] },
  // ── بین‌گروهی؛ همیشه آخر، بی‌عنوان ──
  { id: "general", fa: null, cues: null },
];

const ORDER = INTERP_GROUPS.map((g) => g.id);
const GROUP_BY_ID = Object.fromEntries(INTERP_GROUPS.map((g) => [g.id, g]));

// ── جدولِ صریحِ قاعده ← گروه ──
// ⚠️ صریح و کامل، نه استنباط از متن یا از «کلیدهایی که قاعده می‌خواند»: آن استنباط برای esr_elevated (می‌خواند Hb هم)،
//    thyroid (می‌خواند K و Hb)، macrocytic_anemia (می‌خواند TSH) گروهِ غلط می‌داد و ۵۳ قاعدهٔ کیفی (HBV، سیلندرها) هیچ کلیدی
//    نمی‌خوانند. قاعدهٔ تازه بدونِ ورودی در اینجا ⇒ تستِ «هر قاعده یک گروه» قرمز (N1/N16)، نه سکوت.
const T = (s) => s.trim().split(/\s+/);
const RULE_GROUP_LISTS = {
  marrow: T(`pancytopenia cytopenia_triplet peripheral_smear_findings mds_suspicion acute_leukemia_suspicion
    leukocytosis_with_cytopenia reactive_leukocytosis_with_cytopenia schistocytes_screen maha_ttp_suspicion anemia_macrocytic_mds`),
  anemia: T(`thal_trait_no_anemia microcytosis_no_anemia macrocytosis_no_anemia hba2_elevated hba2_low hbf_elevated hb_variant
    zpp_high stfr_index hgb_sex_unknown erythrocytosis erythrocytosis_who_screen severe_anemia_crisis macrocytic_anemia
    folate_deficiency microcytic_anemia normocytic_anemia low_rbc_hct_without_anemia spherocytes_dat spherocytosis_likely
    melena_microcytic_anemia rbc_indices_inconsistent rbc_indices_impossible rbc_indices_implausible neonatal_retic_mild
    iron_deficiency_panel anemia_chronic_disease hemolysis_pattern hemolytic_anemia_possible overt_b12_deficiency borderline_b12_deficiency
    transferrin_abnormal smear_rbc_size hct_rbc_high iron_markers_high anemia_hb_alone iron_low_alone rdw_high tibc_high tibc_low`),
  wbc: T(`extreme_leukocytosis leukocytosis neutrophilia leukopenia severe_neutropenia mild_neutropenia neutrophil_count_missing
    monocytosis monocytopenia lymphopenia eosinophilia basophilia viral_lymphocytosis differential_without_wbc
    band_neutrophil_discordance bandemia cll_suspicion_nccn cml_suspicion mixed_cells_high`),
  plt: T(`platelet_indices_context severe_thrombocytopenia thrombocytopenia thrombocytosis mpv_abnormal isolated_thrombocytopenia`),
  coag: T(`dic_pattern dic_isth_score d_dimer_elevated coagulation_abnormal coag_other_direction fibrinogen_pregnancy_low
    factor_activity factor_inhibitor vwf_panel antithrombin_abnormal thrombin_time_abnormal`),
  inflam: T(`crp_pos_esr_normal crp_elevated esr_elevated sepsis_markers hscrp_ascvd_risk pct_intermediate`),
  glucose: T(`dka_pattern hhs_pattern gestational_diabetes_range random_glucose_above_range glycemia hypoglycemia
    severe_hyperglycemia_uncertain_ketosis eag_result bhb_result hba1c_low hypoglycemia_insulin_not_suppressed`),
  lipid: T(`lipid_profile severe_hypercholesterolemia familial_hypercholesterolemia_youth apob_elevated atherogenic_index`),
  kidney: T(`kidney albuminuria_pattern nephrotic_pattern glomerulonephritis_pattern ckd_pattern_diagnostic creatinine_emergency
    urea_bun_emergency isolated_urea_elevation creatinine_low urea_low hyperuricemia uric_acid_low urine_calcium_abnormal`),
  liver: T(`hyperammonemia liver_pattern bilirubin_pattern alp_isolated ggt_isolated pancreas_pattern cirrhosis_pattern liver_synthetic_dysfunction
    alcoholic_liver_pattern amylase_emergency bilirubin_emergency total_protein_abnormal bilirubin_total_alone albumin_low_alone
    albumin_high_alone ammonia_mild_high bilirubin_direct_high bilirubin_indirect_high neonatal_bilirubin_hour_chart
    pregnancy_hellp_severe_features`),
  electrolyte: T(`severe_acidosis high_anion_gap osmolal_gap_high serum_osmolality_abnormal lactate_elevated normal_ag_acidosis
    metabolic_alkalosis potassium_critical sodium_critical bicarbonate_low_moderate blood_ph_abnormal`),
  mineral: T(`calcium_abnormal magnesium_depletion magnesium_abnormal vitamin_d_abnormal hpt_primary fhh_pattern
    hypercalcemia_pth_independent hypercalcemia_pth_indeterminate hypoparathyroidism hpt_secondary_renal hpt_secondary_nonrenal
    hypocalcemia_pth_indeterminate hpt_renal_advanced pth_isolated_abnormal hypophosphatemia_severe phosphate_abnormal`),
  cardiac: T(`troponin_positive ckmb_high troponin_hs_above_99th natriuretic_peptide_elevated homocysteine_elevated myoglobin_abnormal
    rhabdomyolysis_pattern ck_elevated_alone isolated_ldh_elevation`),
  vitamin: T(`zinc_status copper_deficiency wilson_evaluation`),
  thyroid: T(`thyroid hypothyroid_dyslipidemia_link total_t4_abnormal`),
  adrenal: T(`hyperprolactinemia cortisol_untimed adrenal_insufficiency_likely adrenal_insufficiency_indeterminate
    cortisol_am_high_nonspecific cushing_screen_positive cushing_likely adrenal_discordant`),
  repro: T(`semen_analysis male_gonadal_axis luteal_progesterone hcg_result female_ovarian_axis amh_level female_androgen_excess
    reproductive_hormone_context prenatal_profile_mismatch prenatal_risk_t18_t13_high prenatal_risk_t21_high prenatal_t21_pattern_fts
    prenatal_ntd_afp prenatal_nt_raised prenatal_ue3_very_low prenatal_risk_intermediate prenatal_risk_unrated prenatal_papp_a_low
    prenatal_window_invalid prenatal_risk_low prenatal_marker_notes prenatal_concentration_unread`),
  immune: T(`ana_family_result anca_result hla_b27_result anti_ccp_result complement_result lupus_activity_link ssc_antibody_result
    myositis_antibody_result antiphospholipid_result rf_positive indirect_coombs_result
    celiac_serology_result liver_autoantibody_result mg_antibody_result immunoglobulin_result dnaseb_result
    insulin_result islet_autoantibody_result`),
  infect: T(`hcv_screen_reactive hbv_screen_reactive hiv_screen_reactive brucella_active brucella_2me_only brucella_wright_only
    anti_hbs_result anti_hbc_result aso_result blood_culture_result hpylori_igm_result syphilis_screen_result rubella_igg_status
    h_pylori_result`),
  tumor: T(`tumor_markers_result psa_result monoclonal_gammopathy_lambda monoclonal_gammopathy_kappa`),
  urine: T(`uti_pattern bacteriuria_no_inflammation urine_esterase_without_cells proteinuria_pattern hematuria_pattern
    glycosuria_pattern ketonuria_pattern persistent_microhematuria urine_culture_result urine_nitrite_alone urine_pyuria_alone
    urine_crystals urine_specific_gravity urine_bilirubin_urobilinogen urine_renal_tubular_cells urine_squamous_contamination
    pregnancy_proteinuria_24h urine_cast_rbc urine_cast_wbc urine_cast_tubular urine_cast_waxy_broad urine_cast_fatty
    urine_cast_granular urine_cast_hyaline`),
  stool: T(`stool_melena stool_clay_colored stool_fresh_blood stool_parasite_found stool_mucus_present stool_undigested_food
    stool_loose_consistency gi_stool_result`),
  general: T(`neonatal_reference_context adult_only_reference_child qual_equivocal_result lab_comment_note sex_unknown_value
    csf_glucose_low pleural_glucose_low sweat_chloride_result ascites_runyon_pattern unit_unknown_values ph_type_ambiguous`),
};

export const RULE_GROUP = Object.freeze(Object.fromEntries(
  Object.entries(RULE_GROUP_LISTS).flatMap(([g, ids]) => ids.map((id) => [id, g])),
));

/** گروهِ یک یافته. یافتهٔ ناشناخته (مثلاً تورهای unmatched/unexplained) ⇒ general، یعنی آخر. */
export const groupOf = (f) => RULE_GROUP[f?.rule_id] ?? "general";

/** ترتیبِ ثابتِ گروه‌ها؛ درونِ گروه ترتیبِ ورودی (فوریت) حفظ می‌شود. */
export function orderFindings(findings = []) {
  return findings
    .map((f, i) => [f, i])
    .sort((a, b) => ORDER.indexOf(groupOf(a[0])) - ORDER.indexOf(groupOf(b[0])) || a[1] - b[1])
    .map(([f]) => f);
}

// آزمایش‌هایی که متنِ مدل می‌تواند نامشان را ببرد، به‌تفکیکِ گروه — فقط برای بازگرداندنِ جملهٔ جاافتادهٔ مدل
// به گروهِ خودش (relocate). موتور تصمیمی از آن نمی‌گیرد.
const MARKER_GROUPS = {
  marrow: [], anemia: T(`HGB HCT RBC MCV MCH MCHC RDW_CV RDW_SD RETIC FERRITIN IRON TIBC TSAT TRANSFERRIN B12 FOLATE HAPTO`),
  wbc: T(`WBC NEUT_ABS LYMPH_ABS MONO_ABS EOS_ABS BASO_ABS BAND_ABS`), plt: T(`PLT MPV`),
  coag: T(`PT APTT INR FIB DDIMER`), inflam: T(`CRP CRP_Q ESR`),
  glucose: T(`GLU_F GLU_2H GLU_RANDOM HBA1C`), lipid: T(`CHOL HDL LDL TG APOB`), kidney: T(`CREAT UREA UREA_N URIC`),
  liver: T(`AST ALT ALP GGT BILI_T BILI_D BILI_I ALB`), electrolyte: T(`NA K CL HCO3`), mineral: T(`CA MG PHOS PTH VIT_D`),
  cardiac: T(`TROPONIN_I CK CK_MB BNP NTPROBNP LDH`), thyroid: T(`TSH FT4 FT3 T3 T4`),
};
const markerGroup = new Map();
for (const [g, keys] of Object.entries(MARKER_GROUPS)) for (const k of keys) markerGroup.set(k, g);

// نامِ فارسی/لاتینِ هر آزمایش با مرزِ حرف (نه زیررشته: «K» در «Keto»، «CA» در «CAD»)
const LETTER = "\\p{L}\\p{N}_";
const markerRes = [...markerGroup].map(([k, g]) => {
  const names = [...new Set([faName(k), k.replace(/_.*$/, "").length >= 2 ? k : null].filter(Boolean))];
  return { g, re: new RegExp(`(?<![${LETTER}])(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![${LETTER}])`, "iu") };
});
const groupsMentioned = (sentence) => new Set(markerRes.filter(({ re }) => re.test(sentence)).map((m) => m.g));

const flat = (s) => String(s ?? "").replace(/\s*\n+\s*/g, " ").trim();

/**
 * متنِ تفسیر به‌صورتِ «گروه ← متن». هر گروهِ دارای یافته یک پاراگراف می‌شود، همیشه به ترتیبِ INTERP_GROUPS.
 * یافتهٔ supplementary/minor اینجا نیست: آن‌ها در بلوکِ پایانیِ موتور (closing) می‌آیند.
 */
export class GroupedText {
  constructor(findings = []) {
    this.findings = findings.filter((f) => !f.supplementary && !f.minor && f.must_say);
    this.active = new Set(this.findings.map(groupOf));
    this.texts = Object.fromEntries(ORDER.map((g) => [g, ""]));
    this.closing = "";
    this.meta = { filled: [], ignored: [], relocated: 0 };
  }

  #append(g, text) {
    const t = flat(text);
    if (t) this.texts[g] = this.texts[g] ? `${this.texts[g]} ${t}` : t;
  }

  #deterministic(g) {
    return this.findings.filter((f) => groupOf(f) === g).map((f) => flat(f.must_say)).join(" ");
  }

  /**
   * بخش‌های مدل را می‌پذیرد و هرچه کم است از موتور پر می‌کند. `sections` شکلِ دیگری بود (مثلاً فقط interpretation) ⇒ همهٔ گروه‌ها
   * از موتور. شناسهٔ ناشناخته یا گروهِ بی‌یافته نادیده گرفته می‌شود (مدل گروه اختراع نمی‌کند).
   */
  fromModel(sections) {
    if (Array.isArray(sections)) {
      for (const s of sections) {
        const g = s && typeof s === "object" ? s.group : null;
        if (typeof s?.text !== "string" || !s.text.trim()) continue;
        if (!this.active.has(g) || !GROUP_BY_ID[g]) { this.meta.ignored.push(String(g)); continue; }
        this.#append(g, s.text);
      }
      this.#relocate();
    }
    for (const g of ORDER) {
      if (this.active.has(g) && !this.texts[g]) { this.#append(g, this.#deterministic(g)); this.meta.filled.push(g); }
    }
    return this;
  }

  // جمله‌ای که مدل در بخشِ X نوشته ولی فقط آزمایش‌های گروهِ دیگرِ Y را نام می‌برد (و Y پاراگراف دارد) ⇒ به Y می‌رود.
  // محافظه‌کارانه: جملهٔ مشترک (هر دو گروه، یا هیچ‌کدام) سر جایش می‌ماند. فقط متنِ مدل؛ متنِ قطعیِ موتور جابه‌جا نمی‌شود.
  #relocate() {
    const moved = [];
    for (const g of ORDER) {
      if (!this.texts[g]) continue;
      const keep = [];
      for (const s of splitSentences(this.texts[g])) {
        const m = groupsMentioned(s);
        const others = [...m].filter((x) => x !== g);
        // P148: جملهٔ پرانتزی دنبالهٔ جملهٔ قبل است، نه جملهٔ مستقل — «(این مقدار با آلبومین تصحیح شده؛ … 10.6.)» فقط «آلبومین» را
        //   نام می‌برد و از بندِ کلسیم به پاراگرافِ کبد می‌رفت؛ بیمار ۱۱٫۲ را بی‌توضیح دید.
        if (/^\s*\(/.test(s)) keep.push(s);
        else if (others.length === 1 && !m.has(g) && this.active.has(others[0])) moved.push([others[0], s]);
        else keep.push(s);
      }
      this.texts[g] = keep.join(" ");
    }
    for (const [g, s] of moved) this.#append(g, s);
    this.meta.relocated = moved.length;
  }

  /** افزودن به پاراگرافِ گروهِ خودِ یافته (تورهای ایمنی)؛ یافتهٔ گروهِ بی‌پاراگراف پاراگراف تازه می‌سازد. */
  add(finding, text) {
    this.#append(groupOf(finding), text);
    return this;
  }

  /** همان تبدیل روی متنِ هر گروه (حذفِ ادعای ناسنجیده، جملهٔ ممنوع، دوزِ ساختگی) — پاراگراف‌ها دست‌نخورده می‌مانند. */
  transform(fn) {
    for (const g of ORDER) if (this.texts[g]) this.texts[g] = flat(fn(this.texts[g]));
    return this;
  }

  setClosing(s) {
    this.closing = String(s ?? "").replace(/^\s+/, "");
    return this;
  }

  render() {
    const seen = new Set();
    const out = [];
    for (const g of ORDER) {
      let t = this.texts[g];
      if (!t) continue;
      // جملهٔ عیناً تکراری (در همین یا گروهِ پیشین) یک بار می‌ماند.
      const sents = splitSentences(t);
      const uniq = sents.filter((s) => {
        const n = normalizeFa(s);
        if (n.length < 12) return true;
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      });
      if (uniq.length !== sents.length) t = uniq.join(" ");
      const grp = GROUP_BY_ID[g];
      if (grp.cues && !grp.cues.some((c) => normalizeFa(splitSentences(t)[0] ?? "").includes(normalizeFa(c)))) t = `${grp.fa}: ${t}`;
      out.push(t);
    }
    if (this.closing) out.push(this.closing);
    return out.join("\n\n");
  }
}

/** مسیرِ قطعی (بدون مدل): همان چینش از must_sayِ موتور. */
export const renderGroupedMustSay = (findings) => new GroupedText(findings).fromModel(null).render();
