export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-paper">
      <div className="container-page grid gap-10 py-12 lg:grid-cols-4">
        <div>
          <div className="font-display text-lg font-black tracking-wider2">das-shop</div>
          <p className="mt-3 text-sm text-muted">
            Considered everyday wardrobe essentials. Shipped worldwide.
          </p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider2">Help</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Shipping &amp; returns</li>
            <li>Size guide</li>
            <li>Contact</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider2">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>About</li>
            <li>Sustainability</li>
            <li>Careers</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider2">Stay in the loop</h4>
          <p className="mt-3 text-sm text-muted">New drops, first.</p>
          <form className="mt-3 flex border border-ink">
            <input
              type="email"
              placeholder="email@example.com"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
            />
            <button type="button" className="bg-ink px-4 text-xs uppercase tracking-wider2 text-paper">
              Join
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        &copy; {new Date().getFullYear()} das-shop. All rights reserved.
      </div>
    </footer>
  );
}
