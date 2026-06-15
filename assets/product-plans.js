(function () {
  function normalizeLink(link) {
    if (!link) return '';
    const value = String(link).trim();
    if (!value) return '';
    return value.endsWith('/') ? value : `${value}/`;
  }

  function setText(node, selector, value) {
    const target = node.querySelector(selector);
    if (target && value !== undefined && value !== null && value !== '') {
      target.textContent = String(value);
    }
  }

  function setPlanButton(card, plan) {
    const button = card.querySelector('.pcbtn');
    if (!button) return;

    if (plan.href) button.href = plan.href;
    if (plan.buyText) button.textContent = plan.buyText;

    if (plan.available === false) {
      card.classList.add('sout');
      button.classList.add('sout-b');
      button.removeAttribute('href');
      button.setAttribute('aria-disabled', 'true');
      button.tabIndex = -1;

      if (!card.querySelector('.sout-lbl')) {
        const label = document.createElement('div');
        label.className = 'sout-lbl';
        label.textContent = 'OUT OF STOCK';
        card.appendChild(label);
      }
    }
  }

  async function loadPlans() {
    const cards = document.querySelectorAll('[data-plan]');
    if (!cards.length) return;

    try {
      const response = await fetch('/component/products.json', { cache: 'no-store' });
      if (!response.ok) return;

      const data = await response.json();
      const currentPath = normalizeLink(location.pathname);
      const product = Array.isArray(data.items)
        ? data.items.find((entry) => normalizeLink(entry.link) === currentPath)
        : null;
      const plans = product?.plans;
      if (!plans) return;

      cards.forEach((card) => {
        const plan = plans[String(card.dataset.plan || '')];
        if (!plan) return;

        setText(card, '.pcdur', plan.duration);
        setText(card, '.pctype', plan.title);
        setText(card, '.pcsub', plan.subText);
        setText(card, '.amt', plan.price);
        setText(card, '.cc-from strong', plan.priceText || (typeof plan.price === 'number' ? `৳${plan.price}` : plan.price));
        setPlanButton(card, plan);

        if (plan.available !== false) {
          card.classList.remove('sout');
        }
      });
    } catch (error) {
      // Leave the hardcoded fallback intact if the JSON request fails.
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPlans);
  } else {
    loadPlans();
  }
})();