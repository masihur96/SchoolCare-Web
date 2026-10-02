"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "bn";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

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
    
    "modules.badge": "Premium Add-ons",
    "modules.title": "Dedicated Smart Modules",
    "modules.desc": "Elevate your institution with our specialized modules built for modern educational needs, from AI tutors to digital libraries.",
    
    "mod.ebook.title": "Academic Books (E-Learning)",
    "mod.ebook.desc": "E-Book dashboard, manage academic books, and a built-in PDF reader for seamless learning.",
    "mod.ai.title": "AI Tutor",
    "mod.ai.desc": "Interactive AI Chatbot designed specifically to tutor and assist students with their queries.",
    "mod.attendance.title": "Smart Attendance Tracking",
    "mod.attendance.desc": "Advanced mark attendance screens with deep views for students and teachers.",
    "mod.expense.title": "Expense Tracking",
    "mod.expense.desc": "Dedicated dashboard to add, edit, and monitor all institutional expense entries.",
    "mod.library.title": "Library Management",
    "mod.library.desc": "Manage book inventory, requests, tracking, and Smart ID Card Scanner Integration.",
    "mod.online.title": "Online Classes",
    "mod.online.desc": "Create, manage, and view online class schedules through an intuitive list view.",

    "features.title": "Complete control at every level",
    "features.desc": "Dedicated interfaces designed specifically for the unique workflows of administrators, teachers, students, and parents.",
    
    "tab.admin": "Admin Panel",
    "tab.teacher": "Teacher Panel",
    "tab.student": "Student Panel",

    "feat.admin.1.title": "Dashboard Overview",
    "feat.admin.1.desc": "Comprehensive admin dashboard for school analytics and quick actions.",
    "feat.admin.2.title": "Student Management",
    "feat.admin.2.desc": "Add/Edit students, view details, and filter by class & section instantly.",
    "feat.admin.3.title": "Teacher Management",
    "feat.admin.3.desc": "Seamlessly add, edit, and manage teacher information and activities.",
    "feat.admin.4.title": "Attendance Tracking",
    "feat.admin.4.desc": "Monitor both student and teacher attendance in real-time.",
    "feat.admin.5.title": "Exam Management",
    "feat.admin.5.desc": "Create exams, manage views, and publish results effectively.",
    "feat.admin.6.title": "Homework Management",
    "feat.admin.6.desc": "Monitor and assign homework across all classes and sections.",
    "feat.admin.7.title": "Notices & Marquee",
    "feat.admin.7.desc": "Manage general notices and urgent marquee updates.",
    "feat.admin.8.title": "Routine & Timetable",
    "feat.admin.8.desc": "Create complex routines with PDF preview capabilities.",
    "feat.admin.9.title": "Document Engine",
    "feat.admin.9.desc": "Generate Admit Cards, ID Cards, Report Cards, TCs, and Transcripts.",
    "feat.admin.10.title": "Performance Tracking",
    "feat.admin.10.desc": "Deep analytics for student and teacher performance.",
    "feat.admin.11.title": "Communications",
    "feat.admin.11.desc": "Integrated Bulk SMS system for instant alerts.",
    "feat.admin.12.title": "School Onboarding",
    "feat.admin.12.desc": "Manage registration, setup progress, and subscription plans.",

    "feat.student.1.title": "Student Dashboard",
    "feat.student.1.desc": "Personalized dashboard highlighting daily academic activities.",
    "feat.student.2.title": "Attendance Records",
    "feat.student.2.desc": "View personal daily and monthly attendance history.",
    "feat.student.3.title": "Class Routine",
    "feat.student.3.desc": "Access the daily and weekly personal timetable.",
    "feat.student.4.title": "Homework & Assignments",
    "feat.student.4.desc": "Track assigned work and deadlines easily.",
    "feat.student.5.title": "Exam Details",
    "feat.student.5.desc": "View upcoming exam routines and syllabus details.",
    "feat.student.6.title": "Exam Results",
    "feat.student.6.desc": "Access grades and generate personalized report cards.",
    "feat.student.7.title": "Notice Board",
    "feat.student.7.desc": "Read official school announcements and news.",

    "feat.teacher.1.title": "Teacher Dashboard",
    "feat.teacher.1.desc": "Overview of today's classes, pending tasks, and announcements.",
    "feat.teacher.2.title": "Class Routine",
    "feat.teacher.2.desc": "View assigned teaching schedule and free periods.",
    "feat.teacher.3.title": "Self Attendance",
    "feat.teacher.3.desc": "Clock in and out; track personal attendance records.",
    "feat.teacher.4.title": "Homework Management",
    "feat.teacher.4.desc": "Assign homework to classes and review submissions.",
    "feat.teacher.5.title": "Exam Management",
    "feat.teacher.5.desc": "View personal exam invigilation routines and details.",
    "feat.teacher.6.title": "Mark Entry System",
    "feat.teacher.6.desc": "Input and manage student grades securely.",
    "feat.teacher.7.title": "Notice Board",
    "feat.teacher.7.desc": "View targeted announcements for the teaching staff.",

    "pricing.title": "Fair pricing that scales with you",
    "pricing.desc": "More students = more discount. Start small and watch your per-student cost drop as your institution grows.",
    "pricing.popular": "Most Popular",
    "pricing.perStudent": "per student",
    "pricing.month": "/month",
    "pricing.custom": "Custom",
    
    "pricing.plan.free": "Free Trial",
    "pricing.plan.starter": "Starter",
    "pricing.plan.growth": "Growth",
    "pricing.plan.pro": "Pro",
    "pricing.plan.business": "Business",
    "pricing.plan.advanced": "Advanced",
    "pricing.plan.enterprise": "Enterprise",
    
    "pricing.limit.100": "Up to 100 students",
    "pricing.limit.300": "Up to 300 students",
    "pricing.limit.500": "Up to 500 students",
    "pricing.limit.700": "Up to 700 students",
    "pricing.limit.1000": "Up to 1000 students",
    "pricing.limit.custom": "Unlimited students",
    
    "pricing.free.price": "0",
    "pricing.free.duration": "1 month free",

    "pricing.f1": "Full Panel Access",
    "pricing.f2": "Mobile App",
    "pricing.f3": "Support Included",
    
    "auth.login.title": "The Modern Platform for School Excellence",
    "auth.login.sub": "Streamline operations, empower educators, and elevate student outcomes — all from one unified dashboard.",
    "auth.login.trusted": "Trusted by 500+ Schools Worldwide",
    "auth.login.stats.schools": "Schools",
    "auth.login.stats.students": "Students",
    "auth.login.stats.uptime": "Uptime",
    "auth.login.stats.setup": "Setup",
    "auth.login.welcome": "Welcome back",
    "auth.login.welcomeSub": "Sign in to your school management account to continue.",
    "auth.login.email": "Email or Phone number",
    "auth.login.password": "Password",
    "auth.login.forgot": "Forgot password?",
    "auth.login.submit": "Sign in to SchoolCare",
    "auth.login.loading": "Signing in…",
    "auth.login.new": "New to SchoolCare?",
    "auth.login.create": "Create a free account",
    
    "auth.reg.title": "Start managing your school smarter today",
    "auth.reg.sub": "Join 500+ schools that trust SchoolCare to handle attendance, grades, payroll, and analytics — all in one place.",
    "auth.reg.badge": "Free forever · No credit card",
    "auth.reg.perk1": "Setup in under 3 minutes",
    "auth.reg.perk2": "Enterprise-grade security",
    "auth.reg.perk3": "No credit card required",
    "auth.reg.perk4": "Unlimited school branches",
    "auth.reg.loved": "Loved by 120,000+ students & staff",
    "auth.reg.already": "Already have an account?",
    "auth.reg.signin": "Sign in",
    "auth.reg.step1.title": "Create your account",
    "auth.reg.step1.sub": "Enter your details to get started with SchoolCare.",
    "auth.reg.step2.title": "Secure your account",
    "auth.reg.step2.sub": "Choose a strong password to protect your account.",
    "auth.reg.name": "Full name",
    "auth.reg.email": "Work email address",
    "auth.reg.phone": "Phone number",
    "auth.reg.continue": "Continue",
    "auth.reg.pwHint1": "At least 8 characters",
    "auth.reg.pwHint2": "Contains a number",
    "auth.reg.pwHint3": "Contains a letter",
    "auth.reg.submit": "Create free account",
    "auth.reg.loading": "Creating account…",
    "auth.reg.back": "Back to details",
    "auth.reg.terms1": "By creating an account, you agree to our",
    "auth.reg.terms2": "and",

    "footer.rights": "© 2026 SchoolCare EMS. All rights reserved.",
    "footer.terms": "Terms of Service",
    "footer.privacy": "Privacy Policy",
    "footer.contact": "Contact Us"
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

    "modules.badge": "প্রিমিয়াম অ্যাড-অন",
    "modules.title": "ডেডিকেটেড স্মার্ট মডিউল",
    "modules.desc": "এআই টিউটর থেকে ডিজিটাল লাইব্রেরি পর্যন্ত আধুনিক শিক্ষার জন্য নির্মিত বিশেষায়িত মডিউল দিয়ে আপনার প্রতিষ্ঠানকে উন্নত করুন।",
    
    "mod.ebook.title": "একাডেমিক বই (ই-লার্নিং)",
    "mod.ebook.desc": "ই-বুক ড্যাশবোর্ড, একাডেমিক বই পরিচালনা এবং নিরবচ্ছিন্ন শিক্ষার জন্য অন্তর্নির্মিত পিডিএফ রিডার।",
    "mod.ai.title": "এআই টিউটর",
    "mod.ai.desc": "শিক্ষার্থীদের প্রশ্ন সমাধানে সহায়তা করার জন্য বিশেষভাবে ডিজাইন করা ইন্টারেক্টিভ এআই চ্যাটবট।",
    "mod.attendance.title": "স্মার্ট উপস্থিতি ট্র্যাকিং",
    "mod.attendance.desc": "শিক্ষার্থী এবং শিক্ষকদের জন্য ডিপ ভিউ সহ উন্নত উপস্থিতি স্ক্রিন।",
    "mod.expense.title": "ব্যয় ট্র্যাকিং",
    "mod.expense.desc": "প্রাতিষ্ঠানিক ব্যয়ের এন্ট্রি যোগ, সম্পাদনা এবং নিরীক্ষণ করার জন্য ডেডিকেটেড ড্যাশবোর্ড।",
    "mod.library.title": "লাইব্রেরি ম্যানেজমেন্ট",
    "mod.library.desc": "বইয়ের তালিকা, অনুরোধ, ট্র্যাকিং এবং স্মার্ট আইডি কার্ড স্ক্যানার ইন্টিগ্রেশন।",
    "mod.online.title": "অনলাইন ক্লাস",
    "mod.online.desc": "সহজ লিস্ট ভিউয়ের মাধ্যমে অনলাইন ক্লাসের সময়সূচী তৈরি, পরিচালনা এবং দেখুন।",

    "features.title": "প্রতিটি স্তরে সম্পূর্ণ নিয়ন্ত্রণ",
    "features.desc": "অ্যাডমিনিস্ট্রেটর, শিক্ষক, শিক্ষার্থী এবং অভিভাবকদের নির্দিষ্ট কাজের জন্য ডেডিকেটেড ইন্টারফেস।",
    
    "tab.admin": "অ্যাডমিন প্যানেল",
    "tab.teacher": "শিক্ষক প্যানেল",
    "tab.student": "শিক্ষার্থী প্যানেল",

    "feat.admin.1.title": "ড্যাশবোর্ড ওভারভিউ",
    "feat.admin.1.desc": "স্কুল অ্যানালিটিক্স এবং দ্রুত কাজের জন্য বিস্তৃত অ্যাডমিন ড্যাশবোর্ড।",
    "feat.admin.2.title": "শিক্ষার্থী ম্যানেজমেন্ট",
    "feat.admin.2.desc": "শিক্ষার্থীদের তথ্য যোগ/সম্পাদনা করুন, বিবরণ দেখুন এবং ক্লাস ও শাখা অনুযায়ী ফিল্টার করুন।",
    "feat.admin.3.title": "শিক্ষক ম্যানেজমেন্ট",
    "feat.admin.3.desc": "শিক্ষকদের তথ্য এবং কার্যকলাপ নির্বিঘ্নে যোগ, সম্পাদনা এবং পরিচালনা করুন।",
    "feat.admin.4.title": "উপস্থিতি ট্র্যাকিং",
    "feat.admin.4.desc": "শিক্ষার্থী এবং শিক্ষক উভয়ের উপস্থিতি রিয়েল-টাইমে পর্যবেক্ষণ করুন।",
    "feat.admin.5.title": "পরীক্ষা ম্যানেজমেন্ট",
    "feat.admin.5.desc": "পরীক্ষা তৈরি করুন, ভিউ পরিচালনা করুন এবং ফলাফল প্রকাশ করুন।",
    "feat.admin.6.title": "হোমওয়ার্ক ম্যানেজমেন্ট",
    "feat.admin.6.desc": "সমস্ত ক্লাস এবং বিভাগে হোমওয়ার্ক পর্যবেক্ষণ ও প্রদান করুন।",
    "feat.admin.7.title": "নোটিশ এবং মার্কি",
    "feat.admin.7.desc": "সাধারণ নোটিশ এবং জরুরি মার্কি আপডেট পরিচালনা করুন।",
    "feat.admin.8.title": "রুটিন ও সময়সূচী",
    "feat.admin.8.desc": "পিডিএফ প্রিভিউ সহ জটিল রুটিন তৈরি করুন।",
    "feat.admin.9.title": "ডকুমেন্ট ইঞ্জিন",
    "feat.admin.9.desc": "অ্যাডমিট কার্ড, আইডি কার্ড, রিপোর্ট কার্ড, টিসি এবং ট্রান্সক্রিপ্ট তৈরি করুন।",
    "feat.admin.10.title": "পারফরম্যান্স ট্র্যাকিং",
    "feat.admin.10.desc": "শিক্ষার্থী এবং শিক্ষকদের কর্মক্ষমতা নিয়ে গভীর বিশ্লেষণ।",
    "feat.admin.11.title": "যোগাযোগ ব্যবস্থা",
    "feat.admin.11.desc": "তাত্ক্ষণিক সতর্কতার জন্য সমন্বিত বাল্ক এসএমএস সিস্টেম।",
    "feat.admin.12.title": "স্কুল অনবোর্ডিং",
    "feat.admin.12.desc": "নিবন্ধন, সেটআপ অগ্রগতি এবং সাবস্ক্রিপশন প্ল্যান পরিচালনা করুন।",

    "feat.student.1.title": "শিক্ষার্থী ড্যাশবোর্ড",
    "feat.student.1.desc": "দৈনন্দিন একাডেমিক কার্যকলাপ হাইলাইট করার জন্য ব্যক্তিগত ড্যাশবোর্ড।",
    "feat.student.2.title": "উপস্থিতি রেকর্ড",
    "feat.student.2.desc": "ব্যক্তিগত দৈনিক এবং মাসিক উপস্থিতির ইতিহাস দেখুন।",
    "feat.student.3.title": "ক্লাস রুটিন",
    "feat.student.3.desc": "দৈনিক এবং সাপ্তাহিক ব্যক্তিগত সময়সূচী দেখুন।",
    "feat.student.4.title": "হোমওয়ার্ক ও অ্যাসাইনমেন্ট",
    "feat.student.4.desc": "প্রদত্ত কাজ এবং সময়সীমা সহজেই ট্র্যাক করুন।",
    "feat.student.5.title": "পরীক্ষার বিবরণ",
    "feat.student.5.desc": "আসন্ন পরীক্ষার রুটিন এবং সিলেবাসের বিবরণ দেখুন।",
    "feat.student.6.title": "পরীক্ষার ফলাফল",
    "feat.student.6.desc": "গ্রেড দেখুন এবং ব্যক্তিগতকৃত রিপোর্ট কার্ড তৈরি করুন।",
    "feat.student.7.title": "নোটিশ বোর্ড",
    "feat.student.7.desc": "স্কুলের অফিসিয়াল ঘোষণা এবং খবর পড়ুন।",

    "feat.teacher.1.title": "শিক্ষক ড্যাশবোর্ড",
    "feat.teacher.1.desc": "আজকের ক্লাস, মুলতুবি কাজ এবং ঘোষণার ওভারভিউ।",
    "feat.teacher.2.title": "ক্লাস রুটিন",
    "feat.teacher.2.desc": "নির্ধারিত শিক্ষাদানের সময়সূচী এবং ফাঁকা পিরিয়ড দেখুন।",
    "feat.teacher.3.title": "নিজস্ব উপস্থিতি",
    "feat.teacher.3.desc": "ক্লক ইন ও আউট; ব্যক্তিগত উপস্থিতির রেকর্ড ট্র্যাক করুন।",
    "feat.teacher.4.title": "হোমওয়ার্ক ম্যানেজমেন্ট",
    "feat.teacher.4.desc": "ক্লাসে হোমওয়ার্ক দিন এবং জমা পর্যালোচনা করুন।",
    "feat.teacher.5.title": "পরীক্ষা ম্যানেজমেন্ট",
    "feat.teacher.5.desc": "ব্যক্তিগত পরীক্ষার পরিদর্শনের রুটিন এবং বিবরণ দেখুন।",
    "feat.teacher.6.title": "মার্ক এন্ট্রি সিস্টেম",
    "feat.teacher.6.desc": "নিরাপদে শিক্ষার্থীদের গ্রেড ইনপুট এবং পরিচালনা করুন।",
    "feat.teacher.7.title": "নোটিশ বোর্ড",
    "feat.teacher.7.desc": "শিক্ষকদের জন্য নির্দিষ্ট ঘোষণা দেখুন।",

    "pricing.title": "ন্যায্য মূল্য যা আপনার সাথে বাড়ে",
    "pricing.desc": "বেশি শিক্ষার্থী = বেশি ছাড়। ছোট পরিসরে শুরু করুন এবং প্রতিষ্ঠান বড় হওয়ার সাথে সাথে খরচ কমতে দেখুন।",
    "pricing.popular": "সর্বাধিক জনপ্রিয়",
    "pricing.perStudent": "প্রতি শিক্ষার্থী",
    "pricing.month": "/মাস",
    "pricing.custom": "কাস্টম",

    "pricing.plan.free": "ফ্রি ট্রায়াল",
    "pricing.plan.starter": "স্টার্টার",
    "pricing.plan.growth": "গ্রোথ",
    "pricing.plan.pro": "প্রো",
    "pricing.plan.business": "বিজনেস",
    "pricing.plan.advanced": "অ্যাডভান্সড",
    "pricing.plan.enterprise": "এন্টারপ্রাইজ",
    
    "pricing.limit.100": "১০০ জন শিক্ষার্থী পর্যন্ত",
    "pricing.limit.300": "৩০০ জন শিক্ষার্থী পর্যন্ত",
    "pricing.limit.500": "৫০০ জন শিক্ষার্থী পর্যন্ত",
    "pricing.limit.700": "৭০০ জন শিক্ষার্থী পর্যন্ত",
    "pricing.limit.1000": "১০০০ জন শিক্ষার্থী পর্যন্ত",
    "pricing.limit.custom": "সীমাহীন শিক্ষার্থী",
    
    "pricing.free.price": "০",
    "pricing.free.duration": "১ মাস ফ্রি",

    "pricing.f1": "সম্পূর্ণ প্যানেল অ্যাক্সেস",
    "pricing.f2": "মোবাইল অ্যাপ",
    "pricing.f3": "সাপোর্ট অন্তর্ভুক্ত",
    
    "auth.login.title": "স্কুল ম্যানেজমেন্টের আধুনিক প্ল্যাটফর্ম",
    "auth.login.sub": "কার্যক্রম সহজ করুন, শিক্ষকদের ক্ষমতায়ন করুন এবং শিক্ষার্থীদের ফলাফল উন্নত করুন — সব এক ড্যাশবোর্ড থেকে।",
    "auth.login.trusted": "বিশ্বব্যাপী ৫০০+ স্কুলের আস্থার প্রতীক",
    "auth.login.stats.schools": "স্কুল",
    "auth.login.stats.students": "শিক্ষার্থী",
    "auth.login.stats.uptime": "আপটাইম",
    "auth.login.stats.setup": "সেটআপ",
    "auth.login.welcome": "স্বাগতম",
    "auth.login.welcomeSub": "চালিয়ে যেতে আপনার স্কুল ম্যানেজমেন্ট অ্যাকাউন্টে সাইন ইন করুন।",
    "auth.login.email": "ইমেইল বা ফোন নম্বর",
    "auth.login.password": "পাসওয়ার্ড",
    "auth.login.forgot": "পাসওয়ার্ড ভুলে গেছেন?",
    "auth.login.submit": "SchoolCare এ সাইন ইন করুন",
    "auth.login.loading": "সাইন ইন হচ্ছে…",
    "auth.login.new": "SchoolCare এ নতুন?",
    "auth.login.create": "ফ্রি অ্যাকাউন্ট তৈরি করুন",
    
    "auth.reg.title": "আজই স্মার্টভাবে স্কুল পরিচালনা শুরু করুন",
    "auth.reg.sub": "৫০০+ স্কুলের সাথে যোগ দিন যারা উপস্থিতি, গ্রেড, পেরোল এবং অ্যানালিটিক্স পরিচালনার জন্য SchoolCare কে বিশ্বাস করে।",
    "auth.reg.badge": "সম্পূর্ণ ফ্রি · কোনো ক্রেডিট কার্ড লাগবে না",
    "auth.reg.perk1": "৩ মিনিটেরও কম সময়ে সেটআপ",
    "auth.reg.perk2": "এন্টারপ্রাইজ-গ্রেড নিরাপত্তা",
    "auth.reg.perk3": "কোনো ক্রেডিট কার্ডের প্রয়োজন নেই",
    "auth.reg.perk4": "সীমাহীন স্কুল শাখা",
    "auth.reg.loved": "১,২০,০০০+ শিক্ষার্থী ও কর্মীদের পছন্দের",
    "auth.reg.already": "ইতিমধ্যেই একটি অ্যাকাউন্ট আছে?",
    "auth.reg.signin": "লগ ইন করুন",
    "auth.reg.step1.title": "আপনার অ্যাকাউন্ট তৈরি করুন",
    "auth.reg.step1.sub": "SchoolCare শুরু করতে আপনার তথ্য দিন।",
    "auth.reg.step2.title": "অ্যাকাউন্ট সুরক্ষিত করুন",
    "auth.reg.step2.sub": "আপনার অ্যাকাউন্ট সুরক্ষিত রাখতে একটি শক্তিশালী পাসওয়ার্ড বেছে নিন।",
    "auth.reg.name": "পুরো নাম",
    "auth.reg.email": "কাজের ইমেইল ঠিকানা",
    "auth.reg.phone": "ফোন নম্বর",
    "auth.reg.continue": "চালিয়ে যান",
    "auth.reg.pwHint1": "কমপক্ষে ৮ অক্ষর",
    "auth.reg.pwHint2": "একটি সংখ্যা থাকতে হবে",
    "auth.reg.pwHint3": "একটি অক্ষর থাকতে হবে",
    "auth.reg.submit": "ফ্রি অ্যাকাউন্ট তৈরি করুন",
    "auth.reg.loading": "অ্যাকাউন্ট তৈরি হচ্ছে…",
    "auth.reg.back": "তথ্যে ফিরে যান",
    "auth.reg.terms1": "অ্যাকাউন্ট তৈরি করার মাধ্যমে, আপনি আমাদের",
    "auth.reg.terms2": "এবং",

    "footer.rights": "© ২০২৬ SchoolCare EMS. সর্বস্বত্ব সংরক্ষিত।",
    "footer.terms": "পরিষেবার শর্তাবলী",
    "footer.privacy": "গোপনীয়তা নীতি",
    "footer.contact": "যোগাযোগ করুন"
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
