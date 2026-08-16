"use client";

import type { CSSProperties } from "react";

type BuddyMood = "coach" | "peek" | "proud" | "thinking";

export default function StudyBuddy({
  mood = "coach",
  className = "",
  size = 220,
}: {
  mood?: BuddyMood;
  className?: string;
  size?: number;
}) {
  const style = { "--buddy-size": `${size}px` } as CSSProperties;

  return (
    <div className={`study-buddy study-buddy-${mood} ${className}`.trim()} style={style} aria-hidden="true">
      <svg viewBox="0 0 240 240" role="img" focusable="false">
        <defs>
          <linearGradient id="buddyBody" x1="55" y1="35" x2="182" y2="197" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4D8CFF" />
            <stop offset="0.52" stopColor="#1760E8" />
            <stop offset="1" stopColor="#0B3FAE" />
          </linearGradient>
          <linearGradient id="buddyShoe" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#F8FBFF" />
            <stop offset="1" stopColor="#D9E7FF" />
          </linearGradient>
          <filter id="buddyShadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#082C72" floodOpacity="0.18" />
          </filter>
        </defs>
        <ellipse cx="121" cy="218" rx="64" ry="10" fill="#0E4DBA" opacity="0.12" />
        <g filter="url(#buddyShadow)">
          <circle cx="103" cy="43" r="20" fill="#2C73F4" />
          <circle cx="137" cy="46" r="17" fill="#2368EA" />
          <path d="M120 45C76 45 48 77 48 129c0 46 27 76 72 76 44 0 72-30 72-76 0-52-28-84-72-84Z" fill="url(#buddyBody)" />
          <path d="M76 104c10-8 20-10 30-5" stroke="#082657" strokeWidth="7" strokeLinecap="round" />
          <path d="M135 99c10-5 20-3 29 5" stroke="#082657" strokeWidth="7" strokeLinecap="round" />
          <ellipse cx="94" cy="123" rx="10" ry="15" fill="#071F49" />
          <ellipse cx="149" cy="123" rx="10" ry="15" fill="#071F49" />
          <circle cx="97" cy="118" r="3.5" fill="white" />
          <circle cx="152" cy="118" r="3.5" fill="white" />
          <path d="M110 144c8 6 17 6 25 0" stroke="#071F49" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <ellipse cx="80" cy="143" rx="12" ry="6" fill="#67A2FF" opacity="0.65" />
          <ellipse cx="162" cy="143" rx="12" ry="6" fill="#67A2FF" opacity="0.65" />
          <path d="M57 137c-15 8-21 20-16 31 4 9 14 9 23 2" fill="none" stroke="#1760E8" strokeWidth="15" strokeLinecap="round" />
          <path d="M184 136c14 5 21 16 18 27-2 9-11 12-21 8" fill="none" stroke="#0F50D0" strokeWidth="15" strokeLinecap="round" />
          <g className="buddy-pencil" transform="translate(39 145) rotate(-22)">
            <rect x="0" y="0" width="11" height="55" rx="4" fill="#FFC247" />
            <rect x="0" y="43" width="11" height="8" fill="#E8EEF9" />
            <rect x="0" y="50" width="11" height="8" rx="3" fill="#FF7C8C" />
            <path d="M0 0 5.5-12 11 0Z" fill="#F4D7B1" />
            <path d="M4-8 5.5-12 7-8Z" fill="#17233E" />
          </g>
          <g className="buddy-notepad" transform="translate(166 135) rotate(8)">
            <rect x="0" y="0" width="48" height="62" rx="8" fill="#F9FBFF" stroke="#B9D0FA" strokeWidth="3" />
            <path d="M10 18h8v8h-8zM10 34h8v8h-8zM10 50h8v8h-8z" fill="none" stroke="#1760E8" strokeWidth="2.5" />
            <path d="m11 21 3 3 6-7M11 37l3 3 6-7M11 53l3 3 6-7" fill="none" stroke="#1760E8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 22h14M24 38h14M24 54h14" stroke="#AAC2E8" strokeWidth="3" strokeLinecap="round" />
          </g>
          <path d="M94 196v14M146 196v14" stroke="#0E4FCB" strokeWidth="14" strokeLinecap="round" />
          <g>
            <path d="M70 205h44c3 0 6 3 6 7v3c0 5-4 8-9 8H77c-8 0-13-4-13-9 0-4 2-7 6-9Z" fill="url(#buddyShoe)" stroke="#0D51CB" strokeWidth="4" />
            <path d="M126 205h44c4 2 6 5 6 9 0 5-5 9-13 9h-34c-5 0-9-3-9-8v-3c0-4 3-7 6-7Z" fill="url(#buddyShoe)" stroke="#0D51CB" strokeWidth="4" />
            <path d="M79 210h25M136 210h25" stroke="#7AA7EE" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>
        <g className="buddy-spark" fill="#2F7BFF">
          <path d="M203 72v18M194 81h18" stroke="#2F7BFF" strokeWidth="4" strokeLinecap="round" />
          <circle cx="213" cy="61" r="3" />
        </g>
      </svg>
    </div>
  );
}
