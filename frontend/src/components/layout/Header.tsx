import "./layout.css";

type HeaderProps = {
  onMenuToggle?: () => void;
};

export default function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__burger" onClick={onMenuToggle}>
        <span className="header__burger-line" />
        <span className="header__burger-line" />
        <span className="header__burger-line" />
      </div>

      <div className="header__title">BARS</div>
    </header>
  );
}