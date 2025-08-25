// src/components/header.js
export default function Header() {
  const el = document.createElement('header');
  el.className = 'top-header';

  el.innerHTML = `
    <div class="top-header-inner">
      <div class="logo">
        <a href="#/home" class="logo-link">🍏 DemoApp</a>
      </div>
      <nav class="nav">
        <a href="#/planner" class="nav-link">Planner</a>
        <a href="#/recipes" class="nav-link">Ricette</a>
        <a href="#/foods" class="nav-link">Cibi</a>
        <a href="#/allergies" class="nav-link">Allergie</a>
      </nav>
    </div>
  `;

  return el;
}
