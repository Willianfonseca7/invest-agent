import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <LanguageSwitcher />
      </div>
    </header>
  );
}

export default Navbar;
