"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "bn";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// A simple dictionary for the landing page
const dictionary = {
  en: {
    "nav.signIn": "Sign in",
    "nav.getStarted": "Get Started",
    "hero.badge": "The Future of School Management",
    "hero.title1": "Manage your institution",
    "hero.title2": "smarter, not harder.",
    "hero.sub": "A complete ecosystem for administrators, teachers, students, and parents. Automate attendance, grading, communication, and payroll in one premium platform.",
    "hero.cta1": "Create Free Account",
    "hero.cta2": "Explore Features",
    "hero.trust1": "Free 7-day trial",
    "hero.trust2": "No credit card required",
    "hero.trust3": "Cancel anytime",
    "about.title": "Built for the modern institution",
    "about.desc": "SchoolCare was born out of a simple necessity: education management shouldn't be trapped in the past. We've combined enterprise-grade architecture with consumer-grade design to create a platform that everyone—from principles to parents—actually enjoys using.",
    "about.perk1.title": "Mobile App Included",
    "about.perk1.desc": "Stay connected on iOS and Android wherever you are.",
    "about.perk2.title": "Bangla Support",
    "about.perk2.desc": "Fully localized interface and support in Bengali.",
    "about.perk3.title": "Free Training",
    "about.perk3.desc": "Onboarding and training provided at zero extra cost.",
    "features.title": "Complete control at every level",
    "features.desc": "Dedicated interfaces designed specifically for the unique workflows of administrators, teachers, students, and parents.",
    "pricing.title": "Fair pricing that scales with you",
    "pricing.desc": "More students = more discount. Start small and watch your per-student cost drop as your institution grows.",
    "footer.rights": "© 2026 SchoolCare EMS. All rights reserved.",
  },
  bn: {
    "nav.signIn": "লগ ইন করুন",
    "nav.getStarted": "শুরু করুন",
    "hero.badge": "স্কুল ম্যানেজমেন্টের ভবিষ্যৎ",
    "hero.title1": "আপনার প্রতিষ্ঠান পরিচালনা করুন",
    "hero.title2": "আরও স্মার্টভাবে।",
    "hero.sub": "অ্যাডমিনিস্ট্রেটর, শিক্ষক, শিক্ষার্থী এবং অভিভাবকদের জন্য একটি সম্পূর্ণ ইকোসিস্টেম। এটেনডেন্স, গ্রেডিং, যোগাযোগ এবং পেরোল একটি প্রিমিয়াম প্ল্যাটফর্মে স্বয়ংক্রিয় করুন।",
    "hero.cta1": "ফ্রি অ্যাকাউন্ট তৈরি করুন",
    "hero.cta2": "ফিচারগুলো এক্সপ্লোর করুন",
    "hero.trust1": "৭ দিনের ফ্রি ট্রায়াল",
    "hero.trust2": "কোনো ক্রেডিট কার্ডের প্রয়োজন নেই",
    "hero.trust3": "যেকোনো সময় বাতিল করুন",
    "about.title": "আধুনিক প্রতিষ্ঠানের জন্য তৈরি",
    "about.desc": "স্কুলকেয়ার একটি সাধারণ প্রয়োজন থেকে তৈরি হয়েছে: শিক্ষাব্যবস্থাপনা অতীতে আটকে থাকা উচিত নয়। আমরা এন্টারপ্রাইজ-গ্রেড আর্কিটেকচারের সাথে কনজ্যুমার-গ্রেড ডিজাইন যুক্ত করেছি এমন একটি প্ল্যাটফর্ম তৈরি করতে যা সবাই উপভোগ করে।",
    "about.perk1.title": "মোবাইল অ্যাপ অন্তর্ভুক্ত",
    "about.perk1.desc": "আপনি যেখানেই থাকুন না কেন iOS এবং Android এর সাথে সংযুক্ত থাকুন।",
    "about.perk2.title": "বাংলা সাপোর্ট",
    "about.perk2.desc": "বাংলা ভাষায় সম্পূর্ণ ইন্টারফেস এবং সাপোর্ট।",
    "about.perk3.title": "ফ্রি ট্রেনিং",
    "about.perk3.desc": "কোনো অতিরিক্ত খরচ ছাড়াই অনবোর্ডিং এবং ট্রেনিং প্রদান করা হয়।",
    "features.title": "প্রতিটি স্তরে সম্পূর্ণ নিয়ন্ত্রণ",
    "features.desc": "অ্যাডমিনিস্ট্রেটর, শিক্ষক, শিক্ষার্থী এবং অভিভাবকদের নির্দিষ্ট কাজের জন্য ডেডিকেটেড ইন্টারফেস।",
    "pricing.title": "ন্যায্য মূল্য যা আপনার সাথে বাড়ে",
    "pricing.desc": "বেশি শিক্ষার্থী = বেশি ছাড়। ছোট পরিসরে শুরু করুন এবং প্রতিষ্ঠান বড় হওয়ার সাথে সাথে খরচ কমতে দেখুন।",
    "footer.rights": "© ২০২৬ SchoolCare EMS. সর্বস্বত্ব সংরক্ষিত।",
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("app-language") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "bn")) {
      setLanguage(savedLang);
    }
    setMounted(true);
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("app-language", lang);
  };

  const t = (key: string): string => {
    // @ts-ignore
    return dictionary[language]?.[key] || key;
  };

  // Provide a default empty translation context during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ language: "en", setLanguage: () => {}, t: (k) => dictionary.en[k as keyof typeof dictionary.en] || k }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
