(function () {
  'use strict';

  const SAVE_KEY = 'quilldash-ring-rush-save-v1';

  // Recruits: each adds rings/sec once owned, cost scales up each purchase.
  const RECRUITS = [
    {
      id: 'tails',
      name: "Tails' Workshop",
      desc: '+1 ring/sec — tinkers up spare rings between builds',
      baseCost: 15,
      rps: 1,
      color: '#FF9F43'
    },
    {
      id: 'amy',
      name: "Amy's Hammer Run",
      desc: '+5 rings/sec — clears a ring trail on her rounds',
      baseCost: 100,
      rps: 5,
      color: '#FF6B9E'
    },
    {
      id: 'knuckles',
      name: "Knuckles' Patrol",
      desc: '+20 rings/sec — guards (and finds) a stash on every lap',
      baseCost: 600,
      rps: 20,
      color: '#E4392E'
    },
    {
      id: 'shadow',
      name: "Shadow's Chaos Boost",
      desc: '+80 rings/sec — a shortcut only he knows how to take',
      baseCost: 3500,
      rps: 80,
      color: '#B9B9C6'
    },
    {
      id: 'rouge',
      name: "Rouge's Vault Runs",
      desc: '+300 rings/sec — she always finds where the good stuff is',
      baseCost: 20000,
      rps: 300,
      color: '#E0A8D8'
    }
  ];

  const CLICK_UPGRADE_BASE_COST = 50;
  const CLICK_UPGRADE_GROWTH = 1.8;
  const RECRUIT_COST_GROWTH = 1.15;

  let state = {
    rings: 0,
    clickPower: 1,
    clickUpgradesBought: 0,
    owned: {} // recruitId -> count
  };

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign(state, parsed);
      }
    } catch (e) {
      console.warn('Could not load save', e);
    }
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save progress', e);
    }
  }

  function costFor(baseCost, growth, ownedCount) {
    return Math.ceil(baseCost * Math.pow(growth, ownedCount));
  }

  function totalRps() {
    return RECRUITS.reduce((sum, r) => {
      const owned = state.owned[r.id] || 0;
      return sum + owned * r.rps;
    }, 0);
  }

  function fmt(n) {
    if (n < 1000) return Math.floor(n).toString();
    const units = ['K', 'M', 'B', 'T'];
    let unitIndex = -1;
    let value = n;
    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000;
      unitIndex++;
    }
    return value.toFixed(value < 10 ? 2 : 1) + units[unitIndex];
  }

  // ---------- DOM ----------
  const ringTotalEl = document.getElementById('ringTotal');
  const rpsEl = document.getElementById('ringsPerSec');
  const clickTarget = document.getElementById('clickTarget');
  const clickPowerVal = document.getElementById('clickPowerVal');
  const shopList = document.getElementById('shopList');
  const resetBtn = document.getElementById('resetBtn');

  function render() {
    ringTotalEl.textContent = fmt(state.rings);
    rpsEl.textContent = `${fmt(totalRps())} rings/sec`;
    clickPowerVal.textContent = fmt(state.clickPower);
    renderShop();
  }

  function renderShop() {
    shopList.innerHTML = '';

    // Click power upgrade, always first
    const clickCost = costFor(CLICK_UPGRADE_BASE_COST, CLICK_UPGRADE_GROWTH, state.clickUpgradesBought);
    shopList.appendChild(buildShopItem({
      name: "Sneakers Upgrade",
      desc: `+1 ring per click (currently +${state.clickPower})`,
      color: '#3E64FF',
      cost: clickCost,
      owned: state.clickUpgradesBought,
      onBuy: () => {
        if (state.rings < clickCost) return;
        state.rings -= clickCost;
        state.clickPower += 1;
        state.clickUpgradesBought += 1;
        save();
        render();
      }
    }));

    RECRUITS.forEach(r => {
      const owned = state.owned[r.id] || 0;
      const cost = costFor(r.baseCost, RECRUIT_COST_GROWTH, owned);
      shopList.appendChild(buildShopItem({
        name: r.name,
        desc: r.desc,
        color: r.color,
        cost,
        owned,
        onBuy: () => {
          if (state.rings < cost) return;
          state.rings -= cost;
          state.owned[r.id] = owned + 1;
          save();
          render();
        }
      }));
    });
  }

  function buildShopItem({ name, desc, color, cost, owned, onBuy }) {
    const btn = document.createElement('button');
    btn.className = 'shop-item';
    btn.disabled = state.rings < cost;
    btn.innerHTML = `
      <span class="shop-icon" style="background:${color}"></span>
      <span class="shop-info">
        <span class="shop-name">${name}</span>
        <span class="shop-desc">${desc}</span>
      </span>
      <span class="shop-meta">
        <span class="shop-cost">${fmt(cost)} rings</span>
        <span class="shop-owned">Owned: ${owned}</span>
      </span>
    `;
    btn.addEventListener('click', onBuy);
    return btn;
  }

  clickTarget.addEventListener('click', () => {
    state.rings += state.clickPower;
    render();
  });

  resetBtn.addEventListener('click', () => {
    const sure = confirm('Reset all your Ring Rush progress? This can\'t be undone.');
    if (!sure) return;
    state = { rings: 0, clickPower: 1, clickUpgradesBought: 0, owned: {} };
    save();
    render();
  });

  // Passive income tick
  setInterval(() => {
    const rps = totalRps();
    if (rps > 0) {
      state.rings += rps / 10; // tick 10x/sec for smoothness
      render();
    }
  }, 100);

  // Autosave
  setInterval(save, 5000);

  load();
  render();
})();
