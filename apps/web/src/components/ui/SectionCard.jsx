export function SectionCard({ title, description, children }) {
  return (
    <section className="section-card">
      <header className="section-card__header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}
