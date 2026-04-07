import SideNavBar from "@/components/admin/SideNavBar";
import TopNavBar from "@/components/admin/TopNavBar";
import React from "react";
import { Manrope, Inter } from "next/font/google";
import { AuthenticatedAppProviders } from "@/providers/app-providers";

const manrope = Manrope({ subsets: ["latin"], variable: '--font-heading' });
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: '--font-sans' });

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedAppProviders>
      <div className={`${manrope.variable} ${inter.variable} bg-[#f9fafb] dark:bg-background text-foreground font-body selection:bg-primary/30 min-h-screen m-0 p-0`}>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <style>{`
          .glass-panel {
              background: rgba(255, 255, 255, 0.7);
              backdrop-filter: blur(12px);
              border: 1px solid rgba(124, 58, 237, 0.1);
          }
          .dark .glass-panel {
              background: rgba(42, 44, 50, 0.4);
              border-top: 1px solid rgba(189, 157, 255, 0.15);
              border-right: none;
              border-bottom: none;
              border-left: none;
          }
          .text-gradient {
              background: linear-gradient(to right, #7c3aed, #0ea5e9);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
          }
          .dark .text-gradient {
              background: linear-gradient(to right, #bd9dff, #34b5fa);
          }
          .material-symbols-outlined {
              font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
              vertical-align: middle;
          }
          /* Custom Checkbox Styling */
          input[type="checkbox"] {
              appearance: none;
              background-color: rgba(124, 58, 237, 0.05);
              margin: 0;
              font: inherit;
              color: currentColor;
              width: 1.25rem;
              height: 1.25rem;
              border: 1px solid rgba(124, 58, 237, 0.2);
              border-radius: 0.25rem;
              display: grid;
              place-content: center;
              cursor: pointer;
              transition: all 0.2s ease;
          }
          .dark input[type="checkbox"] {
              background-color: rgba(189, 157, 255, 0.1);
              border-color: rgba(189, 157, 255, 0.3);
          }
          input[type="checkbox"]::before {
              content: "";
              width: 0.65rem;
              height: 0.65rem;
              transform: scale(0);
              transition: 120ms transform ease-in-out;
              box-shadow: inset 1rem 1rem #7c3aed;
              clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
          }
          .dark input[type="checkbox"]::before {
              box-shadow: inset 1rem 1rem #bd9dff;
          }
          input[type="checkbox"]:checked::before {
              transform: scale(1);
          }
          input[type="checkbox"]:checked {
              background-color: rgba(124, 58, 237, 0.1);
              border-color: #7c3aed;
          }
          .dark input[type="checkbox"]:checked {
              background-color: rgba(189, 157, 255, 0.2);
              border-color: #bd9dff;
          }
          select {
              appearance: none;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
              background-repeat: no-repeat;
              background-position: right 0.75rem center;
              background-size: 1rem;
          }
          .dark select {
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2375757a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          }
          
          /* Drawer animation helpers */
          .drawer-open {
              overflow: hidden;
          }
          .drawer-open #drawer-overlay {
              opacity: 1;
              pointer-events: auto;
          }
          .drawer-open #review-drawer {
              transform: translateX(0);
          }
      
          @keyframes reveal-up {
              from {
                  opacity: 0;
                  transform: translateY(20px);
              }
              to {
                  opacity: 1;
                  transform: translateY(0);
              }
          }
          .reveal-item {
              animation: reveal-up 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
              opacity: 0;
          }
          .glass-input {
              background: rgba(255, 255, 255, 0.7);
              backdrop-filter: blur(8px);
              border: 1px solid rgba(0, 0, 0, 0.1);
              transition: all 0.3s ease;
          }
          .glass-input:focus {
              background: rgba(255, 255, 255, 0.9);
              border-color: rgba(99, 102, 241, 0.5);
              box-shadow: 0 0 20px rgba(99, 102, 241, 0.1);
              outline: none;
          }
          .dark .glass-input {
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.08);
          }
          .dark .glass-input:focus {
              background: rgba(255, 255, 255, 0.06);
          }
          .glass-card {
              background: rgba(255, 255, 255, 0.7);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(124, 58, 237, 0.1);
          }
          .dark .glass-card {
              background: rgba(24, 25, 30, 0.6);
              border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .pulse-indicator {
              position: relative;
          }
          .pulse-indicator::after {
              content: '';
              position: absolute;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: currentColor;
              opacity: 0.4;
              animation: pulse 2s infinite;
              left: 0;
              top: 0;
          }
          @keyframes pulse {
              0% { transform: scale(1); opacity: 0.4; }
              100% { transform: scale(2.5); opacity: 0; }
          }
        `}</style>
  
        <SideNavBar />
  
        <main className="ml-64 relative min-h-screen">
          <TopNavBar />
          {children}
        </main>
      </div>
    </AuthenticatedAppProviders>
  );
}
