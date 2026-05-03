import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0f0409]/70 border-b border-white/[0.06]">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-3 p-3">
          <img src="/img/bslogo.png" className="h-8 object-contain" alt="" />
          <h1 className="font-hello text-2xl font-bold text-zinc-100 tracking-tight">
            Brawl Analytics
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
