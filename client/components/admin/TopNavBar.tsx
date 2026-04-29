import React from "react";

export default function TopNavBar() {
  return (
    <header className="flex items-center justify-between px-8 sticky top-0 z-40 bg-background/80 backdrop-blur-sm w-full h-16 font-body text-sm">
      <div className="flex-1"></div>
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-4">
          <button className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full border-2 border-background"></span>
          </button>
          <button className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <span className="material-symbols-outlined">mail</span>
          </button>
        </div>
      </div>
    </header>
  );
}
