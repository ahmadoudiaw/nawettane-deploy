import Image from 'next/image';
import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="app-header">
      <div className="shell app-header__inner">
        <Link className="brand" href="/matches">
          <span className="brand__logo">
            <Image
              src="/logo.png"
              alt="Logo Nawettane"
              width={42}
              height={42}
            />
          </span>
          <span>NAWETTANE</span>
        </Link>

        <nav className="nav">
          <Link href="/matches">Matchs</Link>
          <Link href="/scan">Scan</Link>
          <Link href="/admin/dashboard">Admin</Link>
          <Link href="/login">Connexion</Link>
        </nav>
      </div>
    </header>
  );
}
