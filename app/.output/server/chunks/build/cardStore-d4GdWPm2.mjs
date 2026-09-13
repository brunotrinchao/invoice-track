import { d as defineStore } from './server.mjs';

const useCardStore = defineStore("cards", {
  state: () => ({
    cards: [],
    loading: false,
    error: null
  }),
  actions: {
    async fetchAll() {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("/api/cards");
        if (!res.ok) throw new Error(`GET /api/cards -> ${res.status}`);
        this.cards = await res.json();
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
      } finally {
        this.loading = false;
      }
    },
    async remove(id) {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE /api/cards/${id} -> ${res.status}`);
      this.cards = this.cards.filter((c) => c.id !== id);
    }
  }
});

export { useCardStore as u };
//# sourceMappingURL=cardStore-d4GdWPm2.mjs.map
