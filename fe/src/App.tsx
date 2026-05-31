import { useState } from "react";
import type { Platform } from "./types/types";
import { ALERTS } from "./data/mockData";
import { GlobalDashboard } from "./pages/global/Global";
import { ProductsList } from "./pages/ProductsList/ProductsList";
import { ProductDetail } from "./pages/ProductDetail/ProductDetail";
import { ScrapingPage } from "./pages/Scraping/ScrapingPage";
import { ComparePage } from "./pages/Compare/ComparePage";
import { PlatformsPage } from "./pages/Platforms/PlatformsPage";
import { ChatPage }      from "./pages/Chat/ChatPage";

type Page = "dashboard" | "scraped" | "sellers" | "alerts" | "scraping" | "compare" | "platforms" | "chat";

export default function App() {
  const [page, setPage]               = useState<Page>("scraped");
  const [search, setSearch]           = useState("");
  const [platform, setPlatform]       = useState<"all" | Platform>("all");
  const [maxPrice, setMaxPrice]       = useState(2000);
  const [minRating, setMinRating]     = useState(0);
  const [alerts, setAlerts]           = useState(ALERTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const unread = alerts.filter(a => !a.read).length;

  const navItems = [
    { id: "dashboard" as Page, label: "Dashboard",        icon: "▦" },
    { id: "scraped"   as Page, label: "Scraped Products", icon: "◈" },
    { id: "scraping"  as Page, label: "Scrape",           icon: "⟳" },
    { id: "compare"    as Page, label: "Compare",           icon: "⇌" },
    { id: "platforms"  as Page, label: "Platforms",         icon: "⊞" },
    { id: "chat"       as Page, label: "AI Assistant",       icon: "🤖" },
  ] as const;

  function navigateTo(p: Page) {
    setPage(p);
    setSelectedProductId(null);
    setSidebarOpen(false);
  }

  const pageTitle: Record<Page, string> = {
    dashboard: "Global Overview",
    scraped:   selectedProductId ? "Product Analysis" : "Scraped Products",
    scraping:  "Scrape a Product",
    compare:   "Compare Products",
    platforms: "Platform Intelligence",
    chat:      "AI Assistant",
    sellers:   "Sellers Performance",
    alerts:    "Alerts & Notifications",
  };

  const pageSub: Record<Page, string> = {
    dashboard: "Key performance indicators across all platforms",
    scraped:   selectedProductId
      ? "Deep-dive analysis powered by scraped data"
      : "Products fetched from real e-commerce sites",
    scraping:  "Trigger background scraping jobs and track their status in real time",
    compare:   "Analyze two products side by side — price, rating, sentiment and trends",
    platforms: "Market intelligence aggregated per platform — prices, ratings, deals and top performers",
    chat:      "Ask natural-language questions about your products — powered by Google Gemini",
    sellers:   "Competitiveness analysis per seller",
    alerts:    "Automatically generated change notifications",
  };

  return (
    <div className="h-screen bg-stone-50 flex overflow-hidden" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap');`}</style>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative lg:translate-x-0 lg:shrink-0 inset-y-0 left-0 z-30 w-60 h-full bg-white border-r border-stone-100 flex flex-col overflow-y-auto transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-black">P</span>
            </div>
            <div>
              <p className="text-sm font-black text-stone-800 leading-none">PriceWatch</p>
              <p className="text-[10px] text-stone-400 tracking-wide">E-Commerce Monitor</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => navigateTo(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                page === item.id
                  ? "bg-stone-800 text-white shadow-sm"
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
              }`}>
              <span className="text-base">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {"badge" in item && item.badge > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${page === item.id ? "bg-white text-stone-800" : "bg-red-500 text-white"}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Filters (shown only on scraped products page) */}
        <div className="p-4 border-t border-stone-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Platform</p>
          {(["all", "Amazon", "Jumia", "Hmizate"] as const).map(pl => (
            <button key={pl} onClick={() => setPlatform(pl === "all" ? "all" : pl as Platform)}
              className={`w-full text-left text-sm px-3 py-1.5 rounded-lg mb-0.5 font-medium transition-colors ${
                platform === pl ? "text-stone-800 bg-stone-100" : "text-stone-500 hover:text-stone-700"
              }`}>
              {pl === "all" ? "All Platforms" : pl}
            </button>
          ))}

          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Max Price: {maxPrice}</p>
            <input type="range" min={0} max={5000} value={maxPrice} onChange={e => setMaxPrice(+e.target.value)}
              className="w-full accent-stone-700" />
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Min Rating: {minRating}★</p>
            <input type="range" min={0} max={5} step={0.5} value={minRating} onChange={e => setMinRating(+e.target.value)}
              className="w-full accent-stone-700" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-stone-100 px-5 py-3 flex items-center gap-4 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-stone-500 hover:text-stone-800 text-xl">☰</button>
          {/* Show back breadcrumb when in detail view */}
          {selectedProductId ? (
            <button
              onClick={() => setSelectedProductId(null)}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Products
            </button>
          ) : (
            <div className="flex-1 max-w-md">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-400" />
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-white text-xs font-bold">P</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="mb-5">
              <h2 className="text-xl font-black text-stone-800">{pageTitle[page]}</h2>
              <p className="text-xs text-stone-400 mt-0.5">{pageSub[page]}</p>
            </div>

            {page === "dashboard" && <GlobalDashboard />}

            {page === "scraped" && !selectedProductId && (
              <ProductsList
                search={search}
                platformFilter={platform}
                onSelectProduct={id => setSelectedProductId(id)}
              />
            )}

            {page === "scraped" && selectedProductId && (
              <ProductDetail
                productId={selectedProductId}
                onBack={() => setSelectedProductId(null)}
              />
            )}

            {page === "scraping" && <ScrapingPage />}

            {page === "compare"    && <ComparePage />}

            {page === "platforms"  && <PlatformsPage />}

            {page === "chat"       && <ChatPage />}

          </div>
        </main>
      </div>
    </div>
  );
}
