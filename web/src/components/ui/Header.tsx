import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0f0409]/70 border-b border-white/[0.06]">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-6 p-3">
          <img src="/brawl_analytics_logo2.svg" className="h-14 object-contain" alt="Brawl Analytics logo" />
          <h1 className="font-sans text-2xl font-bold text-zinc-300 tracking-tight">
            brawl_analytics
          </h1>
        </Link>
        <nav className="flex items-center pr-3 gap-1">
          <Link
            to="/"
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors rounded-md"
          >
            Home
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors rounded-md"
          >
            Login
          </Link>
          <Link
            to="/about"
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors rounded-md"
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
